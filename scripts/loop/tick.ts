// ループの 1 tick: 作業ツリーの確認 → 状態収集 → 判定 → ランナー側の書き込み
// → 必要ならセッションを 1 つ起動 → セッションの自己申告を GitHub 側で検証する。

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { decide } from "./decide";
import { applyRunnerActions, releaseInterruptedIssue } from "./escalate";
import { gh, git, graphql } from "./gh";
import { abortGitOperation, currentGitOperation } from "./git-operation";
import { parseLoopResult, runSession } from "./session";
import { CODERABBIT_LOGIN, collectState } from "./state";
import type { Action, Decision, LoopConfig, SessionCommand } from "./types";
import { detectUsageLimit } from "./usage-limit";

export type TickResult =
  | { kind: "success"; detail: string }
  | { kind: "no-task" }
  | { kind: "escalated"; detail: string }
  | { kind: "waiting"; detail: string }
  /** セッションが Claude の利用上限で打ち切られた。resetAt は解除時刻（ISO 形式。読み取れなければ null） */
  | { kind: "usage-limit"; resetAt: string | null }
  | { kind: "failed"; deterministic: boolean; reason: string };

export function loadConfig(env: NodeJS.ProcessEnv = process.env): LoopConfig {
  const num = (key: string, fallback: number) => {
    const value = Number(env[key]);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  };
  return {
    maxFixRounds: num("LOOP_MAX_FIX_ROUNDS", 2),
    nudgeIntervalMinutes: num("LOOP_NUDGE_INTERVAL_MINUTES", 20),
    staleReviewMinutes: num("LOOP_STALE_REVIEW_MINUTES", 20),
  };
}

const SESSION_COMMANDS: Record<
  Exclude<Action["kind"], "wait" | "none">,
  SessionCommand
> = {
  implement: "loop-implement",
  "fix-ci": "loop-fix-ci",
  "fix-main": "loop-fix-main",
  "resolve-coderabbit": "loop-resolve-coderabbit",
};

function log(message: string): void {
  console.log(`[tick] ${message}`);
}

/**
 * main に戻って最新化する。前のセッションが loop/* に残した作業は退避する。
 * 途中のマージ・リベース・cherry-pick が残っていれば、退避の前に取り消す（そのままでは stash できない）
 */
function syncWorkingTree(): TickResult | null {
  try {
    const operation = currentGitOperation();
    const dirty = git(["status", "--porcelain"]).trim() !== "";
    if (operation || dirty) {
      const branch =
        operation?.branch ?? git(["branch", "--show-current"]).trim();
      // 人間の作業かもしれないので、loop/* 以外には手を付けない
      if (!branch.startsWith("loop/")) {
        return {
          kind: "failed",
          deterministic: true,
          reason: `dirty-tree (branch: ${branch}${operation ? `, ${operation.kind} in progress` : ""})`,
        };
      }
      if (operation) {
        log(
          `前のセッションの途中の ${operation.kind} を取り消します: ${branch}`,
        );
        abortGitOperation(operation.kind);
      }
      if (git(["status", "--porcelain"]).trim() !== "") {
        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        log(`前のセッションの作業を退避します: ${branch}`);
        git(["stash", "push", "-u", "-m", `loop-abandoned:${branch}:${stamp}`]);
      }
    }
    git(["checkout", "-q", "main"]);
    git(["pull", "-q", "--ff-only", "origin", "main"]);
    pruneMergedLoopBranches();
  } catch (error) {
    // 片付けに失敗しても、ランナーごと落とさずに一時的な失敗として返す
    log(`作業ツリーの片付けに失敗しました: ${(error as Error).message}`);
    return { kind: "failed", deterministic: false, reason: "git-sync" };
  }
  return null;
}

export async function runTick(
  model: string,
  logFile: string,
): Promise<TickResult> {
  mkdirSync(dirname(logFile), { recursive: true });

  const syncFailure = syncWorkingTree();
  if (syncFailure) return syncFailure;

  let state: ReturnType<typeof collectState>;
  try {
    state = collectState();
  } catch (error) {
    log(`状態収集に失敗しました: ${(error as Error).message}`);
    return { kind: "failed", deterministic: false, reason: "state-collection" };
  }
  const decision: Decision = decide(state, loadConfig(), new Date());
  writeFileSync(
    logFile.replace(/\.log$/, ".state.json"),
    JSON.stringify(state, null, 2),
  );
  writeFileSync(
    logFile.replace(/\.log$/, ".decision.json"),
    JSON.stringify(decision, null, 2),
  );

  const { action } = decision;
  log(
    `状態: main=${state.main.ci} prs=${state.pullRequests.length} ready=${state.readyIssues.length}`,
  );
  log(
    `判定: ${action.kind}${"pr" in action ? ` #${action.pr}` : ""}${"issue" in action ? ` #${action.issue}` : ""} (${action.reason})`,
  );

  let summary: ReturnType<typeof applyRunnerActions>;
  try {
    summary = applyRunnerActions(decision, state.repo);
  } catch (error) {
    log(`ランナー側の書き込みに失敗しました: ${(error as Error).message}`);
    return { kind: "failed", deterministic: false, reason: "escalate" };
  }
  const summaryText = `escalated=${summary.escalated} flagged=${summary.flagged} nudged=${summary.nudged} dismissed=${summary.dismissed}`;

  if (action.kind === "none") {
    return summary.escalated + summary.flagged > 0
      ? { kind: "escalated", detail: summaryText }
      : { kind: "no-task" };
  }
  if (action.kind === "wait") {
    return {
      kind: "waiting",
      detail: `prs=${JSON.stringify(action.pullRequests)} issues=${JSON.stringify(action.issues)}`,
    };
  }

  const command = SESSION_COMMANDS[action.kind];
  const target =
    "pr" in action ? action.pr : "issue" in action ? action.issue : null;
  const headBefore =
    action.kind === "fix-ci"
      ? state.pullRequests.find((pr) => pr.number === action.pr)?.head
      : undefined;

  log(
    `セッション開始: /${command} ${target ?? ""} (model: ${model}) → ${logFile}`,
  );
  const outcome = await runSession(
    command,
    target === null ? "" : String(target),
    model,
    logFile,
  );
  const result = parseLoopResult(outcome.text);
  // 利用上限で打ち切られたセッションは仕事をしていない。0 ターンで終わることもあるので、先に見分ける
  const usageLimit = result ? null : detectUsageLimit(outcome.text, new Date());
  if (usageLimit) {
    releaseIfInterrupted(action);
    return {
      kind: "usage-limit",
      resetAt: usageLimit.resetAt?.toISOString() ?? null,
    };
  }

  if (!result) {
    if (outcome.turns === 0) {
      // モデルが一度も呼ばれていない = コマンド定義の ! 展開が失敗している。再実行しても直らない
      return {
        kind: "failed",
        deterministic: true,
        reason: "session-not-started",
      };
    }
    return { kind: "failed", deterministic: false, reason: "no-result-line" };
  }
  log(result.line);

  switch (result.kind) {
    case "BLOCKED":
      return { kind: "escalated", detail: result.line };
    case "FAILED":
      return {
        kind: "failed",
        deterministic: result.deterministic,
        reason: result.line,
      };
    case "SUCCESS": {
      const verification = verifySuccess(action, state.repo, headBefore);
      return verification === null
        ? { kind: "success", detail: result.line }
        : {
            kind: "failed",
            deterministic: false,
            reason: `verify: ${verification}`,
          };
    }
  }
}

/**
 * セッションの「SUCCESS」を鵜呑みにせず、GitHub 側で成果を確かめる。
 * 問題が無ければ null、あれば理由を返す。
 */
function verifySuccess(
  action: Action,
  repo: string,
  headBefore?: string,
): string | null {
  const openBranches = openPrBranches;

  switch (action.kind) {
    case "implement":
      return openBranches().some((b) =>
        b.startsWith(`loop/issue-${action.issue}-`),
      )
        ? null
        : `Issue #${action.issue} の PR（loop/issue-${action.issue}-*）が見つからない`;
    case "fix-main":
      return openBranches().some((b) => b.startsWith("loop/fix-main-"))
        ? null
        : "main 修理の PR（loop/fix-main-*）が見つからない";
    case "fix-ci": {
      const headAfter = gh([
        "pr",
        "view",
        String(action.pr),
        "--json",
        "headRefOid",
        "--jq",
        ".headRefOid",
      ]).trim();
      return headAfter !== "" && headAfter !== headBefore
        ? null
        : `PR #${action.pr} の head が進んでいない（push されていない）`;
    }
    case "resolve-coderabbit": {
      const [owner, name] = repo.split("/");
      const threads = graphql<{
        repository: {
          pullRequest: {
            reviewThreads: {
              nodes: {
                isResolved: boolean;
                comments: { nodes: { author: { login: string } | null }[] };
              }[];
            };
          };
        };
      }>(
        `query { repository(owner: "${owner}", name: "${name}") { pullRequest(number: ${action.pr}) { reviewThreads(first: 100) { nodes { isResolved comments(first: 1) { nodes { author { login } } } } } } } }`,
      ).repository.pullRequest.reviewThreads.nodes;
      const unresolved = threads.filter(
        (t) =>
          !t.isResolved &&
          t.comments.nodes[0]?.author?.login === CODERABBIT_LOGIN,
      ).length;
      return unresolved === 0
        ? null
        : `PR #${action.pr} に未解決の CodeRabbit スレッドが ${unresolved} 件残っている`;
    }
    default:
      return null;
  }
}

/**
 * open な PR の head のブランチ名。Issue を着手し直すかの判定にも使うので、
 * 取りこぼさないよう上限は十分に大きくする
 */
function openPrBranches(): string[] {
  return gh([
    "pr",
    "list",
    "--state",
    "open",
    "--limit",
    "1000",
    "--json",
    "headRefName",
    "--jq",
    ".[].headRefName",
  ])
    .split("\n")
    .filter(Boolean);
}

/**
 * 利用上限で打ち切られたセッションのあと、loop:ready に戻すべき Issue の番号。戻さなくてよければ null。
 * 実装のセッションが Issue に loop:wip を付けたまま、PR を作る前に打ち切られたときだけ戻す
 * （PR があれば、続きは CI の修理や CodeRabbit への対応で拾える）
 */
export function interruptedIssueToRelease(
  action: Action,
  issueLabels: readonly string[],
  openBranches: readonly string[],
): number | null {
  if (action.kind !== "implement") return null;
  if (!issueLabels.includes("loop:wip")) return null;
  const prefix = `loop/issue-${action.issue}-`;
  if (openBranches.some((b) => b.startsWith(prefix))) return null;
  return action.issue;
}

/** 打ち切られた実装の Issue を、次の tick で着手し直せるよう loop:ready に戻す */
function releaseIfInterrupted(action: Action): void {
  if (action.kind !== "implement") return;
  try {
    const labels = gh([
      "issue",
      "view",
      String(action.issue),
      "--json",
      "labels",
      "--jq",
      ".labels[].name",
    ])
      .split("\n")
      .filter(Boolean);
    const issue = interruptedIssueToRelease(action, labels, openPrBranches());
    if (issue === null) return;
    releaseInterruptedIssue(issue);
    log(
      `Issue #${issue} を loop:ready に戻しました（利用上限で打ち切られたため）`,
    );
  } catch (error) {
    // 戻せなくても、待って再開する流れは止めない（人間が loop:wip を見つけて戻せる）
    log(
      `Issue #${action.issue} を loop:ready に戻せませんでした: ${(error as Error).message}`,
    );
  }
}

/**
 * 取り込み済み（独自のコミットがない）ローカルの loop/* ブランチを消す。
 * 打ち切られたセッションのブランチが残ると、同じ Issue に着手し直すときに同じ名前で作れなくなる。
 * git branch -d は独自のコミットがあるブランチを消さないので、作業は失われない
 */
function pruneMergedLoopBranches(): void {
  const merged = git([
    "branch",
    "--merged",
    "HEAD",
    "--list",
    "loop/*",
    "--format=%(refname:short)",
  ])
    .split("\n")
    .map((b) => b.trim())
    .filter(Boolean);
  for (const branch of merged) {
    try {
      git(["branch", "-d", branch]);
      log(`取り込み済みのブランチを消しました: ${branch}`);
    } catch {
      // upstream に取り込まれていないブランチは -d が拒否する。消さずに残し、tick は止めない
      log(`ブランチを消せなかったので残します: ${branch}`);
    }
  }
}
