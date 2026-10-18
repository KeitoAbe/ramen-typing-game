import {
  bowlPrice,
  bowlPriceRate,
  FRESH_PRICE_RATE,
  isSoggy,
  MIN_PRICE_RATE,
  SOGGY_BASE_MS,
  SOGGY_MS_PER_KEY,
  SOGGY_START_RATIO,
  soggyLimitMs,
} from "@/client/lib/ramen-bowl";
import { orderPrice } from "@/client/lib/ramen-result";
import type { Order } from "@/types/order";

// shio = 4 キー、shoyu = 6 キー
const shio: Order = { id: "shio", text: "塩", reading: "しお" };
const shoyu: Order = { id: "shoyu", text: "しょうゆ", reading: "しょうゆ" };

describe("soggyLimitMs", () => {
  it("打つキー数に見合った時間でのびる", () => {
    expect(soggyLimitMs(shio)).toBe(SOGGY_BASE_MS + 4 * SOGGY_MS_PER_KEY);
  });

  it("問題が長いほどのびるまでの時間が長い", () => {
    expect(soggyLimitMs(shoyu)).toBeGreaterThan(soggyLimitMs(shio));
  });
});

describe("isSoggy", () => {
  it("のびきるまでの時間に達したらのびきり", () => {
    const limitMs = soggyLimitMs(shio);
    expect(isSoggy(shio, limitMs - 1)).toBe(false);
    expect(isSoggy(shio, limitMs)).toBe(true);
  });

  it("のびきるまでの時間を渡すと、その時間で判定する", () => {
    expect(isSoggy(shio, 999, 1_000)).toBe(false);
    expect(isSoggy(shio, 1_000, 1_000)).toBe(true);
  });
});

describe("bowlPriceRate", () => {
  const limitMs = soggyLimitMs(shio);

  it("出てすぐ完食すると、できたての上乗せがつく", () => {
    expect(bowlPriceRate(shio, 0)).toBe(FRESH_PRICE_RATE);
  });

  it("のびかけに入る時点でちょうど定価", () => {
    expect(bowlPriceRate(shio, limitMs * SOGGY_START_RATIO)).toBeCloseTo(1);
  });

  it("のびかけで完食すると定価より安く、のびきる直前で最も安い", () => {
    expect(bowlPriceRate(shio, limitMs * 0.75)).toBeLessThan(1);
    expect(bowlPriceRate(shio, limitMs - 1)).toBeCloseTo(MIN_PRICE_RATE, 3);
  });

  it("早く完食するほど倍率が高い", () => {
    const rates = [0, 0.25, 0.5, 0.75, 0.99].map((ratio) =>
      bowlPriceRate(shio, limitMs * ratio),
    );
    for (let i = 1; i < rates.length; i++) {
      expect(rates[i]).toBeLessThan(rates[i - 1]);
    }
  });

  it("のびきったら 0", () => {
    expect(bowlPriceRate(shio, limitMs)).toBe(0);
    expect(bowlPriceRate(shio, limitMs * 2)).toBe(0);
  });

  it("のびきるまでの時間を渡すと、その時間に対する割合で値段が下がる", () => {
    const shortMs = limitMs * 0.7;
    expect(bowlPriceRate(shio, shortMs * 0.75, shortMs)).toBeCloseTo(
      bowlPriceRate(shio, limitMs * 0.75),
    );
    expect(bowlPriceRate(shio, shortMs, shortMs)).toBe(0);
  });
});

describe("bowlPrice", () => {
  const limitMs = soggyLimitMs(shoyu);

  it("できたてで完食すると定価より高い", () => {
    // 定価 400 円 × 1.2
    expect(orderPrice(shoyu)).toBe(400);
    expect(bowlPrice(shoyu, 0)).toBe(480);
  });

  it("のびかけで完食すると減額される", () => {
    // のびかけの真ん中なので、定価と最安値（0.5 倍）の中間の 0.75 倍
    expect(bowlPrice(shoyu, limitMs * 0.75)).toBe(300);
  });

  it("10 円単位に丸める", () => {
    expect(bowlPrice(shoyu, limitMs * 0.6) % 10).toBe(0);
  });

  it("のびきった丼は 0 円", () => {
    expect(bowlPrice(shoyu, limitMs)).toBe(0);
  });
});
