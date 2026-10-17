// LoopState から「この tick で何をするか」を決める。副作用を持たない純粋関数にしてあり、
// 判定の挙動は tests/scripts/loop/decide.test.ts で固定している。
//
// 判定順（上から最初に当たったもの）:
//   1. main の CI が赤（main 修理の PR がまだ無い）   → fix-main
//   2. 動かせる loop PR がある                        → fix-ci / resolve-coderabbit
//   3. 着手できる loop:ready Issue がある             → implement（loop:unblock 優先、次に番号の小さい順）
//   4. 結果待ちの PR か依存待ちの Issue しか無い      → wait
//   5. 何も無い                                       → none

import type {
  Action,
  Decision,
  LoopConfig,
  LoopPullRequest,
  LoopState,
  ReadyIssue,
} from "./types";

const FIX_MAIN_BRANCH_PREFIX = "loop/fix-main-";
const REVIEWED = new Set(["SUCCESS", "FAILURE", "ERROR"]);

const minutesSince = (iso: string, now: Date): number =>
  (now.getTime() - new Date(iso).getTime()) / 60_000;

const needsCiFix = (pr: LoopPullRequest): boolean =>
  pr.ciComplete === "FAILURE" || pr.mergeState === "DIRTY";

/**
 * CodeRabbit の指摘をすべて裁いたのに Request changes が APPROVED に切り替わらず、
 * auto-merge が止まっている PR か。
 * head のコミット時刻とレビューの投稿時刻の両方が十分古いことを求める。片方だけだと、
 * 再レビューで切り替わる途中の PR まで取り下げてしまう。
 */
const hasStaleChangesRequested = (
  pr: LoopPullRequest,
  config: LoopConfig,
  now: Date,
): boolean =>
  pr.changesRequested !== null &&
  pr.reviewDecision === "CHANGES_REQUESTED" &&
  pr.unresolvedThreads.codeRabbit === 0 &&
  pr.unresolvedThreads.human === 0 &&
  REVIEWED.has(pr.codeRabbit) &&
  !needsCiFix(pr) &&
  pr.headCommittedAt !== null &&
  minutesSince(pr.headCommittedAt, now) >= config.staleReviewMinutes &&
  minutesSince(pr.changesRequested.submittedAt, now) >=
    config.staleReviewMinutes;

const isStartable = (issue: ReadyIssue): boolean =>
  issue.trusted && issue.dependencies.every((d) => d.status === "merged");

const hasDeadDependency = (issue: ReadyIssue): boolean =>
  issue.dependencies.some((d) => d.status === "closed-unmerged");

export function decide(
  state: LoopState,
  config: LoopConfig,
  now: Date,
): Decision {
  // 人間に引き継ぎ済み（Issue が loop:human / loop:blocked）の PR はループの対象外
  const activePrs = state.pullRequests.filter((pr) => !pr.issue?.escalated);

  const escalations: Decision["escalations"] = [];
  for (const pr of activePrs) {
    if (pr.unresolvedThreads.human > 0) {
      escalations.push({
        pr: pr.number,
        issue: pr.issue?.number ?? null,
        reason: "human-review",
      });
    } else if (
      pr.fixRounds >= config.maxFixRounds &&
      pr.unresolvedThreads.codeRabbit > 0
    ) {
      // 予算超過は「未解決の指摘が残っている」ときだけ。Request changes だけが残る状態は dismissals で解く
      escalations.push({
        pr: pr.number,
        issue: pr.issue?.number ?? null,
        reason: "budget-exceeded",
      });
    }
  }
  const escalatedPrs = new Set(escalations.map((e) => e.pr));
  const livePrs = activePrs.filter((pr) => !escalatedPrs.has(pr.number));

  const prActions: Extract<Action, { pr: number }>[] = [];
  for (const pr of livePrs) {
    if (needsCiFix(pr)) {
      prActions.push({
        kind: "fix-ci",
        pr: pr.number,
        reason:
          pr.mergeState === "DIRTY"
            ? "conflict with main"
            : "ci-complete failed",
      });
    } else if (
      (REVIEWED.has(pr.codeRabbit) || pr.codeRabbit === "RATE_LIMITED") &&
      pr.unresolvedThreads.codeRabbit > 0
    ) {
      prActions.push({
        kind: "resolve-coderabbit",
        pr: pr.number,
        reason: `${pr.unresolvedThreads.codeRabbit} unresolved CodeRabbit thread(s)`,
      });
    }
  }
  prActions.sort((a, b) => a.pr - b.pr);
  const actionPrs = new Set(prActions.map((a) => a.pr));
  const inFlightPrs = livePrs
    .filter((pr) => !actionPrs.has(pr.number))
    .map((pr) => pr.number);

  const nudges = livePrs
    .filter(
      (pr) =>
        pr.codeRabbit === "RATE_LIMITED" &&
        pr.unresolvedThreads.codeRabbit === 0 &&
        (pr.nudgedAt === null ||
          minutesSince(pr.nudgedAt, now) >= config.nudgeIntervalMinutes),
    )
    .map((pr) => pr.number);

  const dismissals = livePrs.flatMap((pr) =>
    pr.changesRequested && hasStaleChangesRequested(pr, config, now)
      ? [
          {
            pr: pr.number,
            reviewId: pr.changesRequested.reviewId,
            reviewCommit: pr.changesRequested.commit,
            head: pr.head,
          },
        ]
      : [],
  );

  const flags: Decision["flags"] = [];
  for (const issue of state.readyIssues) {
    if (!issue.trusted)
      flags.push({ issue: issue.number, reason: "untrusted-author" });
    else if (hasDeadDependency(issue))
      flags.push({ issue: issue.number, reason: "dead-dependency" });
  }

  const startable = state.readyIssues
    .filter(isStartable)
    .sort(
      (a, b) => Number(b.unblock) - Number(a.unblock) || a.number - b.number,
    );
  const waitingIssues = state.readyIssues
    .filter((i) => i.trusted && !isStartable(i) && !hasDeadDependency(i))
    .map((i) => i.number);

  const fixMainInFlight = state.pullRequests.some((pr) =>
    pr.branch.startsWith(FIX_MAIN_BRANCH_PREFIX),
  );

  let action: Action;
  if (state.main.ci === "failure" && !fixMainInFlight) {
    action = {
      kind: "fix-main",
      reason: `main CI failed: ${state.main.title}`,
    };
  } else if (prActions.length > 0) {
    action = prActions[0];
  } else if (startable.length > 0) {
    const next = startable[0];
    action = {
      kind: "implement",
      issue: next.number,
      reason: next.unblock
        ? "loop:unblock issue"
        : "lowest ready issue whose dependencies are merged",
    };
  } else if (inFlightPrs.length > 0 || waitingIssues.length > 0) {
    action = {
      kind: "wait",
      reason: "nothing actionable now",
      pullRequests: inFlightPrs,
      issues: waitingIssues,
    };
  } else {
    action = { kind: "none", reason: "no candidates" };
  }

  return { action, escalations, flags, nudges, dismissals };
}
