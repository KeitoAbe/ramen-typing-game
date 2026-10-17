import {
  initialRunnerState,
  nextRunnerState,
  type RunnerState,
} from "@scripts/loop/runner";
import { parseLoopResult } from "@scripts/loop/session";
import type { TickResult } from "@scripts/loop/tick";

const run = (results: TickResult[], target: number): RunnerState =>
  results.reduce((s, r) => nextRunnerState(s, r, target), initialRunnerState());

const success: TickResult = { kind: "success", detail: "" };
const transient: TickResult = {
  kind: "failed",
  deterministic: false,
  reason: "network",
};
const escalated: TickResult = { kind: "escalated", detail: "" };
const waiting: TickResult = { kind: "waiting", detail: "" };

describe("nextRunnerState", () => {
  it("SUCCESS が指定回数に達したら COMPLETED", () => {
    expect(run([success, success], 2)).toMatchObject({
      completed: 2,
      stop: "COMPLETED",
    });
  });

  it("候補が無くなったら即 NO_TASK", () => {
    expect(run([success, { kind: "no-task" }], 5).stop).toBe("NO_TASK");
  });

  it("決定論的な失敗は 1 回で止まる", () => {
    expect(
      run([{ kind: "failed", deterministic: true, reason: "x" }], 5).stop,
    ).toBe("FAILED_DETERMINISTIC");
  });

  it("一過性の失敗は連続 2 回で止まる", () => {
    expect(run([transient, transient], 5).stop).toBe("FAILED_LIMIT");
  });

  it("間に別の結果が挟まれば失敗のカウンタは 0 に戻る", () => {
    expect(run([transient, success, transient], 5)).toMatchObject({
      consecutiveFailures: 1,
      stop: null,
    });
  });

  it("エスカレーションが連続 3 回なら系統的な問題を疑って止まる", () => {
    expect(run([escalated, escalated, escalated], 5).stop).toBe(
      "ESCALATED_LIMIT",
    );
  });

  it("待機は停止理由にならない", () => {
    expect(run([waiting, waiting], 5).stop).toBeNull();
  });

  it("試行回数が指定回数の 4 倍に達したら打ち切る", () => {
    expect(run([escalated, waiting, escalated, waiting], 1).stop).toBe(
      "ATTEMPT_LIMIT",
    );
  });
});

describe("parseLoopResult", () => {
  it("最後の LOOP_RESULT 行を読む", () => {
    const text =
      "LOOP_RESULT: BLOCKED issue=#1 reason=x\n...\nLOOP_RESULT: SUCCESS issue=#1 pr=https://x";
    expect(parseLoopResult(text)).toEqual({
      kind: "SUCCESS",
      line: "LOOP_RESULT: SUCCESS issue=#1 pr=https://x",
    });
  });

  it("FAILED は kind=deterministic かどうかを区別する", () => {
    expect(
      parseLoopResult("LOOP_RESULT: FAILED kind=deterministic reason=x"),
    ).toMatchObject({
      kind: "FAILED",
      deterministic: true,
    });
    expect(
      parseLoopResult("LOOP_RESULT: FAILED kind=transient reason=x"),
    ).toMatchObject({
      kind: "FAILED",
      deterministic: false,
    });
  });

  it("結果行が無ければ null", () => {
    expect(parseLoopResult("途中で終わった")).toBeNull();
  });
});
