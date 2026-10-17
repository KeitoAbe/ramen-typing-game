import {
  emptyPlayStats,
  orderPrice,
  PRICE_PER_KANA,
  summarizePlay,
} from "@/client/lib/ramen-result";

describe("orderPrice", () => {
  it("よみの文字数に比例して値段が決まる", () => {
    expect(orderPrice({ id: "a", text: "塩", reading: "しお" })).toBe(
      2 * PRICE_PER_KANA,
    );
  });

  it("よみが長いほど高い", () => {
    const short = orderPrice({
      id: "a",
      text: "しょうゆ",
      reading: "しょうゆ",
    });
    const long = orderPrice({
      id: "b",
      text: "バリカタでお願いします",
      reading: "ばりかたでおねがいします",
    });
    expect(long).toBeGreaterThan(short);
  });
});

describe("summarizePlay", () => {
  it("正確率と 1 秒あたりの平均打鍵数を出す", () => {
    const result = summarizePlay(
      {
        servedCount: 3,
        discardedCount: 1,
        bill: 1200,
        correctKeyCount: 90,
        missCount: 10,
      },
      60_000,
    );
    expect(result).toEqual({
      servedCount: 3,
      discardedCount: 1,
      bill: 1200,
      correctKeyCount: 90,
      missCount: 10,
      accuracy: 0.9,
      keysPerSecond: 1.5,
    });
  });

  it("1 キーも打っていなければ正確率と平均打鍵数は 0", () => {
    const result = summarizePlay(emptyPlayStats, 60_000);
    expect(result.accuracy).toBe(0);
    expect(result.keysPerSecond).toBe(0);
  });

  it("プレイ時間が 0 なら平均打鍵数は 0", () => {
    const result = summarizePlay({ ...emptyPlayStats, correctKeyCount: 10 }, 0);
    expect(result.keysPerSecond).toBe(0);
  });
});
