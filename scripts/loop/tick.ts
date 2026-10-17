// ループの 1 tick: 作業ツリーの確認 → 状態収集 → 判定 → ランナー側の書き込み
// → 必要ならセッションを 1 つ起動 → セッションの自己申告を GitHub 側で検証する。

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { decide } from "./decide";
import { applyRunnerActions } from "./escalate";
import { gh, git, graphql } from "./gh";
import { parseLoopResult, runSession } from "./session";
import { CODERABBIT_LOGIN, collectState } from "./state";
import type { Action, Decision, LoopConfig, SessionCommand } from "./types";

export type TickResult =
  | { kind: "success"; detail: string }
  | { kind: "no-task" }
  | { kind: "escalated"; detail: string }
  | { kind: "waiting"; detail: string }
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

/** main に戻って最新化する。前のセッションが loop/* に残した作業は退避する */
function syncWorkingTree(): TickResult | null {
  if (git(["status", "--porcelain"]).trim() !== "") {
    const branch = git(["branch", "--show-current"]).trim();
    if (!branch.startsWith("loop/")) {
      return {
        kind: "failed",
        deterministic: true,
        reason: `dirty-tree (branch: ${branch})`,
      };
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    log(`前のセッションの作業を退避します: ${branch}`);
    git(["stash", "push", "-u", "-m", `loop-abandoned:${branch}:${stamp}`]);
  }
  try {
    git(["checkout", "-q", "main"]);
    git(["pull", "-q", "--ff-only", "origin", "main"]);
  } catch {
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
  const openBranches = () =>
    gh([
      "pr",
      "list",
      "--state",
      "open",
      "--limit",
      "100",
      "--json",
      "headRefName",
      "--jq",
      ".[].headRefName",
    ])
      .split("\n")
      .filter(Boolean);

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
