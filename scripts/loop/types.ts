// ループランナーが扱うデータの型。
// state.ts が GitHub から集めた LoopState を、decide.ts が Decision に変換する。

export type MainCiStatus = "success" | "failure" | "in_progress" | "unknown";

/**
 * head コミットに対する CodeRabbit のコミットステータス。
 * レート制限に当たると state は success のまま説明文だけが変わるため、RATE_LIMITED として区別する。
 */
export type CodeRabbitStatus =
  | "SUCCESS"
  | "FAILURE"
  | "ERROR"
  | "PENDING"
  | "RATE_LIMITED"
  | "MISSING";

/** 必須チェック ci-complete の状態（CheckRun の conclusion を大文字にしたもの） */
type RequiredCheckStatus =
  | "SUCCESS"
  | "FAILURE"
  | "PENDING"
  | "MISSING"
  | string;

export type DependencyStatus =
  | "merged"
  | "open"
  | "closed-unmerged"
  | "unknown";

export interface LoopPullRequest {
  number: number;
  title: string;
  branch: string;
  head: string;
  /** GitHub の mergeStateStatus（CLEAN / DIRTY / BLOCKED / BEHIND / UNSTABLE / UNKNOWN） */
  mergeState: string;
  /** GitHub の reviewDecision（APPROVED / CHANGES_REQUESTED / REVIEW_REQUIRED / 空文字） */
  reviewDecision: string;
  autoMerge: boolean;
  ciComplete: RequiredCheckStatus;
  codeRabbit: CodeRabbitStatus;
  headCommittedAt: string | null;
  /** head のコミット以降に `@coderabbitai review` を投げた最新時刻 */
  nudgedAt: string | null;
  /** 「fix: CodeRabbit」で始まるコミットの数 = CodeRabbit 対応の修正ラウンド数 */
  fixRounds: number;
  /** PR 本文の Closes で紐づく Issue */
  issue: { number: number; escalated: boolean } | null;
  unresolvedThreads: { codeRabbit: number; human: number };
  /** coderabbitai が出した、まだ有効な Request changes */
  changesRequested: {
    reviewId: number;
    commit: string;
    submittedAt: string;
  } | null;
}

export interface ReadyIssue {
  number: number;
  title: string;
  /** 起票者が OWNER / MEMBER / COLLABORATOR か */
  trusted: boolean;
  unblock: boolean;
  /** 本文の「#X のマージ後に着手」から読み取った依存 */
  dependencies: { number: number; status: DependencyStatus }[];
}

export interface LoopState {
  collectedAt: string;
  repo: string;
  main: { ci: MainCiStatus; title: string };
  pullRequests: LoopPullRequest[];
  readyIssues: ReadyIssue[];
}

export type SessionCommand =
  | "loop-implement"
  | "loop-fix-ci"
  | "loop-fix-main"
  | "loop-resolve-coderabbit";

export type Action =
  | { kind: "fix-main"; reason: string }
  | { kind: "fix-ci"; pr: number; reason: string }
  | { kind: "resolve-coderabbit"; pr: number; reason: string }
  | { kind: "implement"; issue: number; reason: string }
  | { kind: "wait"; reason: string; pullRequests: number[]; issues: number[] }
  | { kind: "none"; reason: string };

export type EscalationReason = "human-review" | "budget-exceeded";
export type FlagReason = "untrusted-author" | "dead-dependency";

export interface Decision {
  action: Action;
  /** PR ごと人間に引き継ぐ（紐づく Issue を loop:human に） */
  escalations: { pr: number; issue: number | null; reason: EscalationReason }[];
  /** loop:ready の Issue をループの対象から外す（loop:human に） */
  flags: { issue: number; reason: FlagReason }[];
  /** レート制限で未レビューのままの PR に `@coderabbitai review` を投げる */
  nudges: number[];
  /** 指摘を全部裁いたのに残っている Request changes を取り下げる */
  dismissals: {
    pr: number;
    reviewId: number;
    reviewCommit: string;
    head: string;
  }[];
}

export interface LoopConfig {
  maxFixRounds: number;
  nudgeIntervalMinutes: number;
  staleReviewMinutes: number;
}
