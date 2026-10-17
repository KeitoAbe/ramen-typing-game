import { streakPriceRate } from "@/client/lib/ramen-streak";

describe("streakPriceRate", () => {
  it("2 杯目までは倍率がかからない", () => {
    expect(streakPriceRate(0)).toBe(1);
    expect(streakPriceRate(1)).toBe(1);
    expect(streakPriceRate(2)).toBe(1);
  });

  it("3 杯目から ×1.1、5 杯目から ×1.2、10 杯目から ×1.5", () => {
    expect(streakPriceRate(3)).toBe(1.1);
    expect(streakPriceRate(4)).toBe(1.1);
    expect(streakPriceRate(5)).toBe(1.2);
    expect(streakPriceRate(9)).toBe(1.2);
    expect(streakPriceRate(10)).toBe(1.5);
    expect(streakPriceRate(30)).toBe(1.5);
  });
});
