import {
  BALANCE_POP_SECONDS,
  BILL_COUNT_SECONDS,
  countUpValue,
  RECEIPT_ROW_COUNT_SECONDS,
  RESULT_REVEAL,
  receiptRowStartSeconds,
  revealTimeline,
  shopkeeperReactionOf,
} from "@/client/lib/ramen-result-reveal";

describe("revealTimeline", () => {
  it("成績の行 → お会計 → 差し引き → 判子 → 吹き出しの順に、重ならずに進む", () => {
    const timeline = revealTimeline(12);
    expect(timeline.billStart).toBeCloseTo(
      receiptRowStartSeconds(11) + RECEIPT_ROW_COUNT_SECONDS,
    );
    expect(timeline.balanceStart).toBeCloseTo(
      timeline.billStart + BILL_COUNT_SECONDS,
    );
    expect(timeline.stampStart).toBeCloseTo(
      timeline.balanceStart + BALANCE_POP_SECONDS,
    );
    expect(timeline.stampLanding).toBeGreaterThan(timeline.stampStart);
    expect(timeline.stampLanding).toBeLessThan(timeline.stampEnd);
    expect(timeline.end).toBeGreaterThan(timeline.stampEnd);
  });

  it("演出は全体で 3 秒以内に終わる", () => {
    expect(RESULT_REVEAL.end).toBeLessThanOrEqual(3);
  });

  it("成績の行は上から順に、少しずつ遅れて現れる", () => {
    expect(receiptRowStartSeconds(1)).toBeGreaterThan(
      receiptRowStartSeconds(0),
    );
    expect(receiptRowStartSeconds(0)).toBeGreaterThanOrEqual(0);
  });
});

describe("countUpValue", () => {
  it("始まる前は 0、終わったら目標の値", () => {
    expect(countUpValue(1200, 0.5, 1, 0.5)).toBe(0);
    expect(countUpValue(1200, 1.5, 1, 0.5)).toBe(1200);
    expect(countUpValue(1200, Number.POSITIVE_INFINITY, 1, 0.5)).toBe(1200);
  });

  it("途中は 0 と目標のあいだで、時間とともに増える", () => {
    const early = countUpValue(1200, 1.1, 1, 0.5);
    const late = countUpValue(1200, 1.4, 1, 0.5);
    expect(early).toBeGreaterThan(0);
    expect(late).toBeGreaterThan(early);
    expect(late).toBeLessThan(1200);
    expect(Number.isInteger(early)).toBe(true);
  });

  it("小数の値は、指定した桁で丸めて数え上げる", () => {
    const value = countUpValue(98.46, 0.2, 0, 0.35, 1);
    expect(value).toBeLessThan(98.46);
    expect(Math.round(value * 10)).toBe(value * 10);
    expect(countUpValue(98.46, 1, 0, 0.35, 1)).toBe(98.46);
  });

  it("目標が 0 なら、ずっと 0", () => {
    expect(countUpValue(0, 0.2, 0, 0.35)).toBe(0);
  });
});

describe("shopkeeperReactionOf", () => {
  it("上の称号ほど喜ぶ", () => {
    expect(shopkeeperReactionOf("legend")).toEqual({
      mood: "happy",
      isCheering: true,
    });
    expect(shopkeeperReactionOf("critic")).toEqual({
      mood: "happy",
      isCheering: true,
    });
    expect(shopkeeperReactionOf("connoisseur")).toEqual({
      mood: "happy",
      isCheering: false,
    });
    expect(shopkeeperReactionOf("regular")).toEqual({
      mood: "happy",
      isCheering: false,
    });
    expect(shopkeeperReactionOf("hungry")).toEqual({
      mood: "normal",
      isCheering: false,
    });
    expect(shopkeeperReactionOf("passerby")).toEqual({
      mood: "normal",
      isCheering: false,
    });
  });
});
