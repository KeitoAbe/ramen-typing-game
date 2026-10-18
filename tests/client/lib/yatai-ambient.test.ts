import {
  STAR_TWINKLE_MAX_S,
  STAR_TWINKLE_MIN_S,
  starTwinkleTiming,
} from "@/client/lib/yatai-ambient";

const STAR_COUNT = 18;
const timings = Array.from({ length: STAR_COUNT }, (_, index) =>
  starTwinkleTiming(index),
);

/** 描いた瞬間に、瞬きの何割まで進んでいるか（0〜1） */
function phaseOf({ durationS, delayS }: { durationS: number; delayS: number }) {
  return -delayS / durationS;
}

describe("starTwinkleTiming", () => {
  it("瞬く長さは下限と上限のあいだに収まる", () => {
    for (const { durationS } of timings) {
      expect(durationS).toBeGreaterThanOrEqual(STAR_TWINKLE_MIN_S);
      expect(durationS).toBeLessThanOrEqual(STAR_TWINKLE_MAX_S);
    }
  });

  it("始まりは 1 回の瞬きの長さの範囲で、過去にずらす", () => {
    for (const timing of timings) {
      expect(timing.delayS).toBeLessThanOrEqual(0);
      expect(-timing.delayS).toBeLessThanOrEqual(timing.durationS);
    }
  });

  it("隣り合う星どうしは、瞬く長さも描いた瞬間の進み具合も違う（一斉に点滅しない）", () => {
    for (let index = 1; index < STAR_COUNT; index++) {
      const previous = timings[index - 1];
      const current = timings[index];
      expect(Math.abs(current.durationS - previous.durationS)).toBeGreaterThan(
        0.3,
      );
      expect(Math.abs(phaseOf(current) - phaseOf(previous))).toBeGreaterThan(
        0.1,
      );
    }
  });

  it("同じ番号なら、何度呼んでも同じ値を返す", () => {
    expect(starTwinkleTiming(5)).toEqual(starTwinkleTiming(5));
  });
});
