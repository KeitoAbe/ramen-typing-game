import { interruptedIssueToRelease } from "@scripts/loop/tick";
import type { Action } from "@scripts/loop/types";

const implement: Action = { kind: "implement", issue: 90, reason: "" };

describe("interruptedIssueToRelease", () => {
  it("実装の Issue に loop:wip が残り、PR が無ければ戻す", () => {
    expect(
      interruptedIssueToRelease(implement, ["loop:wip"], ["loop/issue-57-x"]),
    ).toBe(90);
  });

  it("PR まで作れていれば戻さない", () => {
    expect(
      interruptedIssueToRelease(
        implement,
        ["loop:wip"],
        ["loop/issue-90-design-foundation"],
      ),
    ).toBeNull();
  });

  it("loop:wip を付ける前に打ち切られていれば、何もしない", () => {
    expect(interruptedIssueToRelease(implement, ["loop:ready"], [])).toBeNull();
  });

  it("番号の前方一致で別の Issue の PR と取り違えない", () => {
    expect(
      interruptedIssueToRelease(
        { kind: "implement", issue: 9, reason: "" },
        ["loop:wip"],
        ["loop/issue-90-design-foundation"],
      ),
    ).toBe(9);
  });

  it("実装以外のセッションでは戻さない", () => {
    expect(
      interruptedIssueToRelease(
        { kind: "fix-ci", pr: 1, reason: "" },
        ["loop:wip"],
        [],
      ),
    ).toBeNull();
  });
});
