import {
  codeRabbitStatus,
  dependencyStatus,
  type PullRequestDetails,
  parseDependencies,
  type RawPullRequest,
  requiredCheckStatus,
  toPullRequest,
} from "@scripts/loop/state";

describe("parseDependencies", () => {
  it("「#X のマージ後に着手」だけを依存として読み、重複を除いて昇順にする", () => {
    const body =
      "#12 のマージ後に着手\n関連: #30\n🤖 #5 のマージ後に着手（理由）\n#12 のマージ後に着手";
    expect(parseDependencies(body)).toEqual([5, 12]);
  });

  it("表記が違えば依存として扱わない", () => {
    expect(parseDependencies("#12 がマージされてから着手")).toEqual([]);
  });
});

describe("dependencyStatus", () => {
  it("Issue を閉じた PR が main にマージされていれば merged", () => {
    expect(
      dependencyStatus({
        __typename: "Issue",
        state: "CLOSED",
        closedByPullRequestsReferences: {
          nodes: [{ merged: true, baseRefName: "main" }],
        },
      }),
    ).toBe("merged");
  });

  it("PR の無いまま閉じた Issue は closed-unmerged（成果物が来ない）", () => {
    expect(
      dependencyStatus({
        __typename: "Issue",
        state: "CLOSED",
        closedByPullRequestsReferences: { nodes: [] },
      }),
    ).toBe("closed-unmerged");
  });

  it("main 以外にマージされた PR は merged とみなさない", () => {
    expect(
      dependencyStatus({
        __typename: "PullRequest",
        state: "MERGED",
        merged: true,
        baseRefName: "develop",
      }),
    ).toBe("closed-unmerged");
  });

  it("取得できなかった依存は unknown", () => {
    expect(dependencyStatus(undefined)).toBe("unknown");
  });
});

describe("requiredCheckStatus / codeRabbitStatus", () => {
  it("完了前の CheckRun は PENDING", () => {
    expect(
      requiredCheckStatus(
        [
          {
            __typename: "CheckRun",
            name: "ci-complete",
            status: "IN_PROGRESS",
          },
        ],
        "ci-complete",
      ),
    ).toBe("PENDING");
  });

  it("チェックが無ければ MISSING", () => {
    expect(requiredCheckStatus([], "ci-complete")).toBe("MISSING");
  });

  it("state が success でも説明文がレート制限なら RATE_LIMITED", () => {
    expect(
      codeRabbitStatus(
        { state: "success", description: "Review rate limited" },
        [],
      ),
    ).toBe("RATE_LIMITED");
  });

  it("コミットステータスの state を大文字にして返す", () => {
    expect(
      codeRabbitStatus(
        { state: "success", description: "Review completed" },
        [],
      ),
    ).toBe("SUCCESS");
  });
});

describe("toPullRequest", () => {
  const raw: RawPullRequest = {
    number: 7,
    title: "feat: x",
    headRefName: "loop/issue-3-x",
    headRefOid: "deadbeef",
    mergeStateStatus: "BLOCKED",
    reviewDecision: "CHANGES_REQUESTED",
    autoMergeRequest: { enabledAt: "2026-10-17T00:00:00Z" },
    statusCheckRollup: [
      {
        __typename: "CheckRun",
        name: "ci-complete",
        status: "COMPLETED",
        conclusion: "SUCCESS",
      },
    ],
  };
  const details: PullRequestDetails = {
    closingIssuesReferences: {
      nodes: [{ number: 3, labels: { nodes: [{ name: "loop:wip" }] } }],
    },
    reviewThreads: {
      nodes: [
        {
          isResolved: false,
          comments: { nodes: [{ author: { login: "coderabbitai" } }] },
        },
        {
          isResolved: false,
          comments: { nodes: [{ author: { login: "alice" } }] },
        },
        {
          isResolved: true,
          comments: { nodes: [{ author: { login: "coderabbitai" } }] },
        },
      ],
    },
    reviews: {
      nodes: [
        {
          databaseId: 1,
          author: { login: "coderabbitai" },
          submittedAt: "2026-10-17T01:00:00Z",
          commit: { oid: "a" },
        },
        {
          databaseId: 2,
          author: { login: "coderabbitai" },
          submittedAt: "2026-10-17T02:00:00Z",
          commit: { oid: "b" },
        },
      ],
    },
    commits: {
      nodes: [
        {
          commit: {
            messageHeadline: "feat: x",
            committedDate: "2026-10-17T00:30:00Z",
          },
        },
        {
          commit: {
            messageHeadline: "fix: CodeRabbit の指摘に対応（型）",
            committedDate: "2026-10-17T03:00:00Z",
          },
        },
      ],
    },
    comments: {
      nodes: [
        { body: "@coderabbitai review", createdAt: "2026-10-17T02:30:00Z" },
        { body: "@coderabbitai review", createdAt: "2026-10-17T03:10:00Z" },
      ],
    },
  };

  it("PR の状態をランナーが判定に使う形にまとめる", () => {
    expect(
      toPullRequest(raw, details, { state: "success", description: "ok" }),
    ).toEqual({
      number: 7,
      title: "feat: x",
      branch: "loop/issue-3-x",
      head: "deadbeef",
      mergeState: "BLOCKED",
      reviewDecision: "CHANGES_REQUESTED",
      autoMerge: true,
      ciComplete: "SUCCESS",
      codeRabbit: "SUCCESS",
      headCommittedAt: "2026-10-17T03:00:00Z",
      // head より前の依頼は数えない
      nudgedAt: "2026-10-17T03:10:00Z",
      fixRounds: 1,
      issue: { number: 3, escalated: false },
      unresolvedThreads: { codeRabbit: 1, human: 1 },
      changesRequested: {
        reviewId: 2,
        commit: "b",
        submittedAt: "2026-10-17T02:00:00Z",
      },
    });
  });

  it("Issue に loop:human か loop:blocked があれば引き継ぎ済みとみなす", () => {
    const escalated: PullRequestDetails = {
      ...details,
      closingIssuesReferences: {
        nodes: [{ number: 3, labels: { nodes: [{ name: "loop:human" }] } }],
      },
    };
    expect(toPullRequest(raw, escalated, undefined).issue).toEqual({
      number: 3,
      escalated: true,
    });
  });
});
