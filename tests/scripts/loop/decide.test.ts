import { decide } from "@scripts/loop/decide";
import { config, issue, minutesAgo, NOW, pr, state } from "./fixtures";

describe("decide: 判定順", () => {
  it("候補が何も無ければ none", () => {
    expect(decide(state(), config, NOW).action.kind).toBe("none");
  });

  it("main の CI が赤なら、PR や Issue より先に fix-main", () => {
    const decision = decide(
      state({
        main: { ci: "failure", title: "broken" },
        pullRequests: [pr({ ciComplete: "FAILURE" })],
        readyIssues: [issue()],
      }),
      config,
      NOW,
    );
    expect(decision.action).toEqual({
      kind: "fix-main",
      reason: "main CI failed: broken",
    });
  });

  it("main 修理の PR が既にあれば fix-main は重ねず、次の判定に進む", () => {
    const decision = decide(
      state({
        main: { ci: "failure", title: "broken" },
        pullRequests: [
          pr({ number: 20, branch: "loop/fix-main-lint", issue: null }),
        ],
        readyIssues: [issue({ number: 3 })],
      }),
      config,
      NOW,
    );
    expect(decision.action).toMatchObject({ kind: "implement", issue: 3 });
  });

  it("壊れた PR があれば、新しい Issue より修理を優先する", () => {
    const decision = decide(
      state({
        pullRequests: [pr({ mergeState: "DIRTY" })],
        readyIssues: [issue({ number: 5 })],
      }),
      config,
      NOW,
    );
    expect(decision.action).toEqual({
      kind: "fix-ci",
      pr: 10,
      reason: "conflict with main",
    });
  });

  it("CodeRabbit がレビュー済みで未解決スレッドがあれば resolve-coderabbit", () => {
    const decision = decide(
      state({
        pullRequests: [
          pr({
            codeRabbit: "SUCCESS",
            unresolvedThreads: { codeRabbit: 2, human: 0 },
          }),
        ],
      }),
      config,
      NOW,
    );
    expect(decision.action).toMatchObject({
      kind: "resolve-coderabbit",
      pr: 10,
    });
  });

  it("CodeRabbit のレビュー中はスレッドが残っていても触らず待つ", () => {
    const decision = decide(
      state({
        pullRequests: [
          pr({
            codeRabbit: "PENDING",
            unresolvedThreads: { codeRabbit: 1, human: 0 },
          }),
        ],
      }),
      config,
      NOW,
    );
    expect(decision.action).toMatchObject({ kind: "wait", pullRequests: [10] });
  });

  it("修理が必要な PR が複数あれば番号の小さい方から", () => {
    const decision = decide(
      state({
        pullRequests: [
          pr({ number: 12, ciComplete: "FAILURE" }),
          pr({ number: 11, ciComplete: "FAILURE" }),
        ],
      }),
      config,
      NOW,
    );
    expect(decision.action).toMatchObject({ kind: "fix-ci", pr: 11 });
  });
});

describe("decide: Issue の選び方", () => {
  it("loop:unblock を番号より優先する", () => {
    const decision = decide(
      state({
        readyIssues: [
          issue({ number: 2 }),
          issue({ number: 9, unblock: true }),
        ],
      }),
      config,
      NOW,
    );
    expect(decision.action).toMatchObject({ kind: "implement", issue: 9 });
  });

  it("依存先が未マージの Issue は読み飛ばし、ほかに無ければ待つ", () => {
    const decision = decide(
      state({
        readyIssues: [issue({ dependencies: [{ number: 4, status: "open" }] })],
      }),
      config,
      NOW,
    );
    expect(decision.action).toMatchObject({ kind: "wait", issues: [1] });
    expect(decision.flags).toEqual([]);
  });

  it("依存先がマージ済みなら着手できる", () => {
    const decision = decide(
      state({
        readyIssues: [
          issue({ dependencies: [{ number: 4, status: "merged" }] }),
        ],
      }),
      config,
      NOW,
    );
    expect(decision.action).toMatchObject({ kind: "implement", issue: 1 });
  });

  it("依存先がマージされずに閉じた Issue は loop:human に回す", () => {
    const decision = decide(
      state({
        readyIssues: [
          issue({ dependencies: [{ number: 4, status: "closed-unmerged" }] }),
        ],
      }),
      config,
      NOW,
    );
    expect(decision.flags).toEqual([{ issue: 1, reason: "dead-dependency" }]);
    expect(decision.action.kind).toBe("none");
  });

  it("メンバー以外が起票した Issue には着手せず loop:human に回す", () => {
    const decision = decide(
      state({ readyIssues: [issue({ trusted: false })] }),
      config,
      NOW,
    );
    expect(decision.flags).toEqual([{ issue: 1, reason: "untrusted-author" }]);
    expect(decision.action.kind).toBe("none");
  });
});

describe("decide: ランナー側のエスカレーション", () => {
  it("人間のレビュースレッドがある PR は人間に引き継ぎ、修理対象から外す", () => {
    const decision = decide(
      state({
        pullRequests: [
          pr({
            ciComplete: "FAILURE",
            unresolvedThreads: { codeRabbit: 0, human: 1 },
          }),
        ],
      }),
      config,
      NOW,
    );
    expect(decision.escalations).toEqual([
      { pr: 10, issue: 1, reason: "human-review" },
    ]);
    expect(decision.action.kind).toBe("none");
  });

  it("修正回数の上限に達しても CodeRabbit の指摘が残る PR は人間に引き継ぐ", () => {
    const decision = decide(
      state({
        pullRequests: [
          pr({
            codeRabbit: "SUCCESS",
            fixRounds: 2,
            unresolvedThreads: { codeRabbit: 1, human: 0 },
          }),
        ],
      }),
      config,
      NOW,
    );
    expect(decision.escalations).toEqual([
      { pr: 10, issue: 1, reason: "budget-exceeded" },
    ]);
  });

  it("修正回数が上限でも、指摘を裁き終えていれば引き継がない", () => {
    const decision = decide(
      state({ pullRequests: [pr({ fixRounds: 2 })] }),
      config,
      NOW,
    );
    expect(decision.escalations).toEqual([]);
  });

  it("引き継ぎ済み（Issue が loop:human）の PR は一切扱わない", () => {
    const decision = decide(
      state({
        pullRequests: [
          pr({ ciComplete: "FAILURE", issue: { number: 1, escalated: true } }),
        ],
      }),
      config,
      NOW,
    );
    expect(decision.action.kind).toBe("none");
    expect(decision.escalations).toEqual([]);
  });
});

describe("decide: CodeRabbit のレート制限", () => {
  it("未レビューのままの PR に再レビューを依頼する", () => {
    const decision = decide(
      state({ pullRequests: [pr({ codeRabbit: "RATE_LIMITED" })] }),
      config,
      NOW,
    );
    expect(decision.nudges).toEqual([10]);
  });

  it("依頼してから間隔が空いていなければ重ねて依頼しない", () => {
    const decision = decide(
      state({
        pullRequests: [
          pr({ codeRabbit: "RATE_LIMITED", nudgedAt: minutesAgo(5) }),
        ],
      }),
      config,
      NOW,
    );
    expect(decision.nudges).toEqual([]);
  });

  it("間隔が空いたら再度依頼する", () => {
    const decision = decide(
      state({
        pullRequests: [
          pr({ codeRabbit: "RATE_LIMITED", nudgedAt: minutesAgo(25) }),
        ],
      }),
      config,
      NOW,
    );
    expect(decision.nudges).toEqual([10]);
  });
});

describe("decide: 取り残された Request changes", () => {
  const stale = (overrides = {}) =>
    pr({
      codeRabbit: "SUCCESS",
      reviewDecision: "CHANGES_REQUESTED",
      headCommittedAt: minutesAgo(30),
      changesRequested: {
        reviewId: 99,
        commit: "old",
        submittedAt: minutesAgo(30),
      },
      ...overrides,
    });

  it("指摘を全部裁いて十分時間が経っていれば取り下げる", () => {
    const decision = decide(state({ pullRequests: [stale()] }), config, NOW);
    expect(decision.dismissals).toEqual([
      { pr: 10, reviewId: 99, reviewCommit: "old", head: "abcdef1234567890" },
    ]);
  });

  it("head が新しいうちは再レビューでの切り替わりを待つ", () => {
    const decision = decide(
      state({ pullRequests: [stale({ headCommittedAt: minutesAgo(5) })] }),
      config,
      NOW,
    );
    expect(decision.dismissals).toEqual([]);
  });

  it("レビューが新しいうちも待つ", () => {
    const decision = decide(
      state({
        pullRequests: [
          stale({
            changesRequested: {
              reviewId: 99,
              commit: "old",
              submittedAt: minutesAgo(5),
            },
          }),
        ],
      }),
      config,
      NOW,
    );
    expect(decision.dismissals).toEqual([]);
  });

  it("未解決スレッドが残っていれば取り下げない", () => {
    const decision = decide(
      state({
        pullRequests: [
          stale({ unresolvedThreads: { codeRabbit: 1, human: 0 } }),
        ],
      }),
      config,
      NOW,
    );
    expect(decision.dismissals).toEqual([]);
  });
});
