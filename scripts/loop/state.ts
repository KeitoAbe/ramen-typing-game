// GitHub からループの現在状態を集めて LoopState にする（読み取り専用。GitHub には何も書かない）。
// 取得（collectState）と整形（toPullRequest / dependencyStatus など）を分け、整形側はテストで固定している。

import { gh, ghJson, graphql, graphqlPartial } from "./gh";
import type {
  CodeRabbitStatus,
  DependencyStatus,
  LoopPullRequest,
  LoopState,
  MainCiStatus,
  ReadyIssue,
} from "./types";

export const CODERABBIT_LOGIN = "coderabbitai";
const LOOP_BRANCH_PREFIX = "loop/";
const FIX_ROUND_PREFIX = "fix: CodeRabbit";
const TRUSTED_ASSOCIATIONS = new Set(["OWNER", "MEMBER", "COLLABORATOR"]);
const DEPENDENCY_PATTERN = /#(\d+) のマージ後に着手/g;

// ---------- 整形（純粋関数） ----------

export interface RawPullRequest {
  number: number;
  title: string;
  headRefName: string;
  headRefOid: string;
  mergeStateStatus: string;
  reviewDecision: string | null;
  autoMergeRequest: unknown | null;
  statusCheckRollup: {
    __typename?: string;
    name?: string;
    context?: string;
    status?: string;
    conclusion?: string | null;
    state?: string;
  }[];
}

export interface PullRequestDetails {
  closingIssuesReferences: {
    nodes: { number: number; labels: { nodes: { name: string }[] } }[];
  };
  reviewThreads: {
    nodes: {
      isResolved: boolean;
      comments: { nodes: { author: { login: string } | null }[] };
    }[];
  };
  reviews: {
    nodes: {
      databaseId: number;
      author: { login: string } | null;
      submittedAt: string | null;
      commit: { oid: string } | null;
    }[];
  };
  commits: {
    nodes: { commit: { messageHeadline: string; committedDate: string } }[];
  };
  comments: { nodes: { body: string; createdAt: string }[] };
}

export interface CommitStatus {
  state?: string;
  description?: string | null;
}

export function requiredCheckStatus(
  rollup: RawPullRequest["statusCheckRollup"],
  name: string,
) {
  const check = rollup.find((c) => (c.name ?? c.context) === name);
  if (!check) return "MISSING";
  if (check.__typename === "CheckRun") {
    return check.status === "COMPLETED"
      ? (check.conclusion ?? "PENDING")
      : "PENDING";
  }
  return check.state ?? "MISSING";
}

export function codeRabbitStatus(
  status: CommitStatus | undefined,
  rollup: RawPullRequest["statusCheckRollup"],
): CodeRabbitStatus {
  if (status?.description && /rate limit/i.test(status.description))
    return "RATE_LIMITED";
  if (status?.state) return status.state.toUpperCase() as CodeRabbitStatus;
  return requiredCheckStatus(rollup, "CodeRabbit") as CodeRabbitStatus;
}

export function toPullRequest(
  raw: RawPullRequest,
  details: PullRequestDetails | undefined,
  status: CommitStatus | undefined,
): LoopPullRequest {
  const firstIssue = details?.closingIssuesReferences.nodes[0];
  const openThreads = (details?.reviewThreads.nodes ?? []).filter(
    (t) => !t.isResolved,
  );
  const isCodeRabbitThread = (t: (typeof openThreads)[number]) =>
    t.comments.nodes[0]?.author?.login === CODERABBIT_LOGIN;
  const commits = details?.commits.nodes ?? [];
  const headCommittedAt = commits.at(-1)?.commit.committedDate ?? null;
  const nudges = (details?.comments.nodes ?? [])
    .filter(
      (c) =>
        c.body.includes("@coderabbitai review") &&
        headCommittedAt !== null &&
        c.createdAt > headCommittedAt,
    )
    .map((c) => c.createdAt)
    .sort();
  const latestChangesRequested = (details?.reviews.nodes ?? [])
    .filter((r) => r.author?.login === CODERABBIT_LOGIN)
    .at(-1);
  const issueLabels = firstIssue?.labels.nodes.map((l) => l.name) ?? [];

  return {
    number: raw.number,
    title: raw.title,
    branch: raw.headRefName,
    head: raw.headRefOid,
    mergeState: raw.mergeStateStatus,
    reviewDecision: raw.reviewDecision ?? "",
    autoMerge: raw.autoMergeRequest !== null,
    ciComplete: requiredCheckStatus(raw.statusCheckRollup, "ci-complete"),
    codeRabbit: codeRabbitStatus(status, raw.statusCheckRollup),
    headCommittedAt,
    nudgedAt: nudges.at(-1) ?? null,
    fixRounds: commits.filter((c) =>
      c.commit.messageHeadline.startsWith(FIX_ROUND_PREFIX),
    ).length,
    issue: firstIssue
      ? {
          number: firstIssue.number,
          escalated:
            issueLabels.includes("loop:human") ||
            issueLabels.includes("loop:blocked"),
        }
      : null,
    unresolvedThreads: {
      codeRabbit: openThreads.filter(isCodeRabbitThread).length,
      human: openThreads.filter((t) => !isCodeRabbitThread(t)).length,
    },
    changesRequested:
      latestChangesRequested?.submittedAt != null
        ? {
            reviewId: latestChangesRequested.databaseId,
            commit: latestChangesRequested.commit?.oid ?? "",
            submittedAt: latestChangesRequested.submittedAt,
          }
        : null,
  };
}

export function parseDependencies(body: string): number[] {
  const numbers = [...body.matchAll(DEPENDENCY_PATTERN)].map((m) =>
    Number(m[1]),
  );
  return [...new Set(numbers)].sort((a, b) => a - b);
}

export type DependencyNode =
  | {
      __typename: "Issue";
      state: string;
      closedByPullRequestsReferences: {
        nodes: { merged: boolean; baseRefName: string }[];
      };
    }
  | {
      __typename: "PullRequest";
      state: string;
      merged: boolean;
      baseRefName: string;
    }
  | null
  | undefined;

/**
 * 依存先の成果物が main にマージ済みかを判定する。
 * Issue のクローズは PR のマージを保証しない（手動で閉じることもある）ので、閉じた PR のマージ状態まで見る。
 */
export function dependencyStatus(node: DependencyNode): DependencyStatus {
  if (!node) return "unknown";
  if (node.__typename === "PullRequest") {
    if (node.merged && node.baseRefName === "main") return "merged";
    return node.state === "OPEN" ? "open" : "closed-unmerged";
  }
  if (node.state === "OPEN") return "open";
  const mergedToMain = node.closedByPullRequestsReferences.nodes.some(
    (pr) => pr.merged && pr.baseRefName === "main",
  );
  if (mergedToMain) return "merged";
  return node.state === "CLOSED" ? "closed-unmerged" : "unknown";
}

// ---------- 取得 ----------

function collectMainCi(): LoopState["main"] {
  const runs = ghJson<
    { status: string; conclusion: string | null; displayTitle: string }[]
  >([
    "run",
    "list",
    "--branch",
    "main",
    "--workflow",
    "ci.yml",
    "--limit",
    "1",
    "--json",
    "status,conclusion,displayTitle",
  ]);
  const run = runs[0];
  if (!run) return { ci: "unknown", title: "" };
  const ci: MainCiStatus =
    run.status !== "completed"
      ? "in_progress"
      : run.conclusion === "success" || run.conclusion === "failure"
        ? run.conclusion
        : "unknown";
  return { ci, title: run.displayTitle };
}

function collectPullRequests(repo: string): LoopPullRequest[] {
  const [owner, name] = repo.split("/");
  const raws = ghJson<RawPullRequest[]>([
    "pr",
    "list",
    "--state",
    "open",
    "--limit",
    "100",
    "--json",
    "number,title,headRefName,headRefOid,mergeStateStatus,reviewDecision,autoMergeRequest,statusCheckRollup",
  ]).filter((pr) => pr.headRefName.startsWith(LOOP_BRANCH_PREFIX));
  if (raws.length === 0) return [];

  // commits などは gh pr list に含めるとノード数の上限に当たるので、loop PR に絞ってから GraphQL で取る
  const fields = raws
    .map(
      (pr) => `pr${pr.number}: pullRequest(number: ${pr.number}) {
        closingIssuesReferences(first: 5) { nodes { number labels(first: 30) { nodes { name } } } }
        reviewThreads(first: 100) { nodes { isResolved comments(first: 1) { nodes { author { login } } } } }
        reviews(last: 20, states: [CHANGES_REQUESTED]) { nodes { databaseId author { login } submittedAt commit { oid } } }
        commits(last: 100) { nodes { commit { messageHeadline committedDate } } }
        comments(last: 30) { nodes { body createdAt } }
      }`,
    )
    .join("\n");
  const details = graphql<{ repository: Record<string, PullRequestDetails> }>(
    `query { repository(owner: "${owner}", name: "${name}") { ${fields} } }`,
  ).repository;

  return raws
    .map((raw) => {
      let status: CommitStatus | undefined;
      try {
        status = ghJson<CommitStatus>([
          "api",
          `repos/${repo}/commits/${raw.headRefOid}/status`,
          "--jq",
          '[.statuses[] | select(.context == "CodeRabbit")] | first // {}',
        ]);
      } catch {
        status = undefined;
      }
      return toPullRequest(raw, details[`pr${raw.number}`], status);
    })
    .sort((a, b) => a.number - b.number);
}

function collectReadyIssues(repo: string): ReadyIssue[] {
  const [owner, name] = repo.split("/");
  const raws = ghJson<
    {
      number: number;
      title: string;
      body: string | null;
      author_association: string;
      labels: { name: string }[];
      pull_request?: unknown;
    }[]
  >([
    "api",
    `repos/${repo}/issues?labels=loop:ready&state=open&per_page=100`,
  ]).filter((i) => i.pull_request === undefined);

  const allDeps = [
    ...new Set(raws.flatMap((i) => parseDependencies(i.body ?? ""))),
  ];
  let nodes: Partial<Record<string, DependencyNode>> = {};
  if (allDeps.length > 0) {
    const fields = allDeps
      .map(
        (n) => `d${n}: issueOrPullRequest(number: ${n}) { __typename
          ... on Issue { state closedByPullRequestsReferences(first: 10) { nodes { merged baseRefName } } }
          ... on PullRequest { state merged baseRefName }
        }`,
      )
      .join("\n");
    nodes =
      graphqlPartial<{ repository: Record<string, DependencyNode> }>(
        `query { repository(owner: "${owner}", name: "${name}") { ${fields} } }`,
      ).repository ?? {};
  }

  return raws
    .map((raw) => ({
      number: raw.number,
      title: raw.title,
      trusted: TRUSTED_ASSOCIATIONS.has(raw.author_association),
      unblock: raw.labels.some((l) => l.name === "loop:unblock"),
      dependencies: parseDependencies(raw.body ?? "").map((n) => ({
        number: n,
        status: dependencyStatus(nodes[`d${n}`]),
      })),
    }))
    .sort((a, b) => a.number - b.number);
}

function currentRepo(): string {
  return gh([
    "repo",
    "view",
    "--json",
    "nameWithOwner",
    "--jq",
    ".nameWithOwner",
  ]).trim();
}

export function collectState(): LoopState {
  const repo = currentRepo();
  return {
    collectedAt: new Date().toISOString(),
    repo,
    main: collectMainCi(),
    pullRequests: collectPullRequests(repo),
    readyIssues: collectReadyIssues(repo),
  };
}

/** collectedAt を除いた状態の指紋。待機中に「何か変わったか」を判定するのに使う */
export function fingerprint(state: LoopState): string {
  const { collectedAt: _ignored, ...rest } = state;
  return JSON.stringify(rest);
}
