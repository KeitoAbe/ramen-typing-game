import {
  GEKIKARA_MISS_PENALTY_MS,
  NINNIKU_SOGGY_RATE,
  TOPPING_PRICE_RATE,
  toppingMissPenaltyMs,
  toppingNames,
  toppingPriceRate,
  toppingSoggyLimitMs,
} from "@/client/lib/ramen-topping";

describe("toppingPriceRate", () => {
  it("何も足さなければ 1 倍", () => {
    expect(toppingPriceRate([])).toBe(1);
  });

  it("トッピング 1 つにつき ×1.3 を掛け合わせる", () => {
    expect(toppingPriceRate(["gekikara"])).toBe(TOPPING_PRICE_RATE);
    expect(toppingPriceRate(["ninniku"])).toBe(TOPPING_PRICE_RATE);
    expect(toppingPriceRate(["gekikara", "ninniku"])).toBe(
      TOPPING_PRICE_RATE * TOPPING_PRICE_RATE,
    );
  });
});

describe("toppingMissPenaltyMs", () => {
  it("激辛のときだけ、ミス 1 回で 1 秒減る", () => {
    expect(toppingMissPenaltyMs([])).toBe(0);
    expect(toppingMissPenaltyMs(["ninniku"])).toBe(0);
    expect(toppingMissPenaltyMs(["gekikara"])).toBe(GEKIKARA_MISS_PENALTY_MS);
    expect(GEKIKARA_MISS_PENALTY_MS).toBe(1_000);
  });
});

describe("toppingSoggyLimitMs", () => {
  it("ニンニクマシマシのときだけ、のびきるまでの時間が 0.7 倍になる", () => {
    expect(toppingSoggyLimitMs(10_000, [])).toBe(10_000);
    expect(toppingSoggyLimitMs(10_000, ["gekikara"])).toBe(10_000);
    expect(toppingSoggyLimitMs(10_000, ["ninniku"])).toBe(
      10_000 * NINNIKU_SOGGY_RATE,
    );
    expect(NINNIKU_SOGGY_RATE).toBe(0.7);
  });
});

describe("toppingNames", () => {
  it("選んだ順によらず、選ぶ画面と同じ順に名前を並べる", () => {
    expect(toppingNames([])).toEqual([]);
    expect(toppingNames(["ninniku", "gekikara"])).toEqual([
      "激辛",
      "ニンニクマシマシ",
    ]);
  });
});
