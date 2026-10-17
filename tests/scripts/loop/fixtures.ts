import type {
  LoopConfig,
  LoopPullRequest,
  LoopState,
  ReadyIssue,
} from "@scripts/loop/types";

export const NOW = new Date("2026-10-17T12:00:00Z");
export const minutesAgo = (m: number) =>
  new Date(NOW.getTime() - m * 60_000).toISOString();

export const config: LoopConfig = {
  maxFixRounds: 2,
  nudgeIntervalMinutes: 20,
  staleReviewMinutes: 20,
};

export const pr = (
  overrides: Partial<LoopPullRequest> = {},
): LoopPullRequest => ({
  number: 10,
  title: "feat: something",
  branch: "loop/issue-1-something",
  head: "abcdef1234567890",
  mergeState: "BLOCKED",
  reviewDecision: "REVIEW_REQUIRED",
  autoMerge: true,
  ciComplete: "SUCCESS",
  codeRabbit: "PENDING",
  headCommittedAt: minutesAgo(5),
  nudgedAt: null,
  fixRounds: 0,
  issue: { number: 1, escalated: false },
  unresolvedThreads: { codeRabbit: 0, human: 0 },
  changesRequested: null,
  ...overrides,
});

export const issue = (overrides: Partial<ReadyIssue> = {}): ReadyIssue => ({
  number: 1,
  title: "feat: something",
  trusted: true,
  unblock: false,
  dependencies: [],
  ...overrides,
});

export const state = (overrides: Partial<LoopState> = {}): LoopState => ({
  collectedAt: NOW.toISOString(),
  repo: "owner/repo",
  main: { ci: "success", title: "latest" },
  pullRequests: [],
  readyIssues: [],
  ...overrides,
});
