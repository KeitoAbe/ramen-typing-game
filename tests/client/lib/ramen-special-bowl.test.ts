import {
  isSpecialBowlRoll,
  SPECIAL_BOWL_CHANCE,
  SPECIAL_BOWL_PRICE_RATE,
  specialBowlPriceRate,
} from "@/client/lib/ramen-special-bowl";

describe("isSpecialBowlRoll", () => {
  it("乱数が確率より小さいときだけ特別な丼になる", () => {
    expect(isSpecialBowlRoll(0)).toBe(true);
    expect(isSpecialBowlRoll(SPECIAL_BOWL_CHANCE - 0.001)).toBe(true);
    expect(isSpecialBowlRoll(SPECIAL_BOWL_CHANCE)).toBe(false);
    expect(isSpecialBowlRoll(0.999)).toBe(false);
  });

  it("およそ 8 杯に 1 杯の確率", () => {
    expect(SPECIAL_BOWL_CHANCE).toBe(1 / 8);
  });
});

describe("specialBowlPriceRate", () => {
  it("特別な丼は値段が 2 倍、普通の丼はそのまま", () => {
    expect(SPECIAL_BOWL_PRICE_RATE).toBe(2);
    expect(specialBowlPriceRate(true)).toBe(2);
    expect(specialBowlPriceRate(false)).toBe(1);
  });
});
