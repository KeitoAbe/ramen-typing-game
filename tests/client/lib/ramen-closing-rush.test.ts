import {
  closingRushPriceRate,
  closingRushSoggyLimitMs,
  isClosingRush,
} from "@/client/lib/ramen-closing-rush";

describe("isClosingRush", () => {
  it("残り 15 秒以下で閉店間際になる", () => {
    expect(isClosingRush(15_001)).toBe(false);
    expect(isClosingRush(15_000)).toBe(true);
    expect(isClosingRush(1)).toBe(true);
  });
});

describe("closingRushPriceRate", () => {
  it("閉店間際なら ×1.5、そうでなければ ×1", () => {
    expect(closingRushPriceRate(true)).toBe(1.5);
    expect(closingRushPriceRate(false)).toBe(1);
  });
});

describe("closingRushSoggyLimitMs", () => {
  it("閉店間際なら 0.7 倍、そうでなければそのまま", () => {
    expect(closingRushSoggyLimitMs(10_000, true)).toBe(7_000);
    expect(closingRushSoggyLimitMs(10_000, false)).toBe(10_000);
  });
});
