import {
  countMissedKey,
  emptyPlayStats,
  orderPrice,
  PRICE_PER_KANA,
  summarizePlay,
  topMissedKeys,
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
        specialServedCount: 1,
        discardedCount: 1,
        bill: 1200,
        correctKeyCount: 90,
        missCount: 10,
        kaedamaCount: 2,
        maxStreak: 2,
        servedBowls: [],
        missedKeys: { a: 10 },
      },
      60_000,
    );
    expect(result).toEqual({
      servedCount: 3,
      specialServedCount: 1,
      discardedCount: 1,
      bill: 1200,
      correctKeyCount: 90,
      missCount: 10,
      kaedamaCount: 2,
      maxStreak: 2,
      servedBowls: [],
      missedKeys: { a: 10 },
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

describe("countMissedKey", () => {
  it("打つべきだったキーの回数を 1 増やす", () => {
    const once = countMissedKey({}, "s");
    expect(once).toEqual({ s: 1 });
    expect(countMissedKey(once, "s")).toEqual({ s: 2 });
    expect(countMissedKey(once, "h")).toEqual({ s: 1, h: 1 });
  });

  it("打つべきキーが分からない（空）なら数えない", () => {
    const missedKeys = { s: 1 };
    expect(countMissedKey(missedKeys, "")).toBe(missedKeys);
  });
});

describe("topMissedKeys", () => {
  it("回数の多い順に上位を回数つきで返す", () => {
    expect(topMissedKeys({ a: 1, s: 5, h: 3, k: 2 }, 3)).toEqual([
      { key: "s", count: 5 },
      { key: "h", count: 3 },
      { key: "k", count: 2 },
    ]);
  });

  it("同じ回数ならキーの順に並べる", () => {
    expect(topMissedKeys({ t: 2, a: 2, k: 2, n: 2 }, 3)).toEqual([
      { key: "a", count: 2 },
      { key: "k", count: 2 },
      { key: "n", count: 2 },
    ]);
  });

  it("打ち間違いがなければ空", () => {
    expect(topMissedKeys({}, 3)).toEqual([]);
  });
});
