import {
  createSeededRandom,
  DAILY_BEST_STORAGE_KEY,
  dailyBowlRoll,
  dailyDateKey,
  dailyOrders,
  formatDailyDate,
  recordDailyBest,
} from "@/client/lib/ramen-daily";
import type { PersonalBestStorage } from "@/client/lib/ramen-personal-best";
import type { Order } from "@/types/order";

const orders: Order[] = Array.from({ length: 20 }, (_, i) => ({
  id: `o${i}`,
  text: `注文${i}`,
  reading: "しお",
}));

function idsOf(list: readonly Order[]): string[] {
  return list.map((order) => order.id);
}

function memoryStorage(initial?: string): PersonalBestStorage & {
  saved: () => string | null;
} {
  let value: string | null = initial ?? null;
  return {
    getItem: (key) => (key === DAILY_BEST_STORAGE_KEY ? value : null),
    setItem: (key, next) => {
      if (key === DAILY_BEST_STORAGE_KEY) value = next;
    },
    saved: () => value,
  };
}

describe("dailyDateKey", () => {
  it("日本時間の 0 時ちょうどから、新しい日付になる", () => {
    // 日本時間 2026-10-18 00:00 は UTC 2026-10-17 15:00
    expect(dailyDateKey(Date.parse("2026-10-17T14:59:59.999Z"))).toBe(
      "2026-10-17",
    );
    expect(dailyDateKey(Date.parse("2026-10-17T15:00:00.000Z"))).toBe(
      "2026-10-18",
    );
  });

  it("UTC では同じ日でも、日本時間で日付が変わっていれば別の日になる", () => {
    expect(dailyDateKey(Date.parse("2026-10-18T00:00:00Z"))).toBe("2026-10-18");
    expect(dailyDateKey(Date.parse("2026-10-18T16:00:00Z"))).toBe("2026-10-19");
  });

  it("年をまたぐ 0 時も日本時間で区切る", () => {
    expect(dailyDateKey(Date.parse("2026-12-31T14:59:59Z"))).toBe("2026-12-31");
    expect(dailyDateKey(Date.parse("2026-12-31T15:00:00Z"))).toBe("2027-01-01");
  });
});

describe("formatDailyDate", () => {
  it("月と日を先頭の 0 なしで表す", () => {
    expect(formatDailyDate("2026-01-05")).toBe("1月5日");
    expect(formatDailyDate("2026-10-18")).toBe("10月18日");
  });
});

describe("createSeededRandom", () => {
  it("同じ種なら同じ並びの乱数を返し、0 以上 1 未満に収まる", () => {
    const a = createSeededRandom(42);
    const b = createSeededRandom(42);
    const values = Array.from({ length: 100 }, () => a());
    expect(Array.from({ length: 100 }, () => b())).toEqual(values);
    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe("dailyOrders", () => {
  it("同じ日付とコースなら、何度並べても同じ順番になる", () => {
    expect(idsOf(dailyOrders(orders, "2026-10-18", "nami"))).toEqual(
      idsOf(dailyOrders(orders, "2026-10-18", "nami")),
    );
  });

  it("日付が違えば、違う順番になる", () => {
    expect(idsOf(dailyOrders(orders, "2026-10-18", "nami"))).not.toEqual(
      idsOf(dailyOrders(orders, "2026-10-19", "nami")),
    );
  });

  it("コースが違えば、違う順番になる", () => {
    expect(idsOf(dailyOrders(orders, "2026-10-18", "nami"))).not.toEqual(
      idsOf(dailyOrders(orders, "2026-10-18", "oomori")),
    );
  });

  it("同じ注文を並べ替えるだけで、元の配列は変えない", () => {
    const shuffled = dailyOrders(orders, "2026-10-18", "nami");
    expect([...idsOf(shuffled)].sort()).toEqual([...idsOf(orders)].sort());
    expect(idsOf(orders)).toEqual(orders.map((_, i) => `o${i}`));
  });
});

describe("dailyBowlRoll", () => {
  const bowls = Array.from({ length: 30 }, (_, i) => i);

  it("同じ日付とコースなら、何杯目かごとに同じ乱数になる", () => {
    const a = dailyBowlRoll("2026-10-18", "nami");
    const b = dailyBowlRoll("2026-10-18", "nami");
    expect(bowls.map(b)).toEqual(bowls.map(a));
  });

  it("日付が違えば、違う乱数になる", () => {
    expect(bowls.map(dailyBowlRoll("2026-10-18", "nami"))).not.toEqual(
      bowls.map(dailyBowlRoll("2026-10-19", "nami")),
    );
  });
});

describe("recordDailyBest", () => {
  it("その日初めてのプレイは、更新として日付つきで保存する", () => {
    const storage = memoryStorage();
    expect(recordDailyBest(storage, "2026-10-18", "nami", 500)).toEqual({
      best: 500,
      isUpdated: true,
      dateKey: "2026-10-18",
    });
    expect(JSON.parse(storage.saved() ?? "null")).toEqual({
      date: "2026-10-18",
      bests: { nami: 500 },
    });
  });

  it("同じ日の記録を上回れば更新し、ほかのコースの記録は残す", () => {
    const storage = memoryStorage(
      JSON.stringify({ date: "2026-10-18", bests: { nami: 500, oomori: 100 } }),
    );
    expect(recordDailyBest(storage, "2026-10-18", "nami", 800).isUpdated).toBe(
      true,
    );
    expect(JSON.parse(storage.saved() ?? "null")).toEqual({
      date: "2026-10-18",
      bests: { nami: 800, oomori: 100 },
    });
  });

  it("同じ日の記録に届かなければ、記録はそのままで保存もしない", () => {
    const saved = JSON.stringify({ date: "2026-10-18", bests: { nami: 500 } });
    const storage = memoryStorage(saved);
    expect(recordDailyBest(storage, "2026-10-18", "nami", 500)).toEqual({
      best: 500,
      isUpdated: false,
      dateKey: "2026-10-18",
    });
    expect(storage.saved()).toBe(saved);
  });

  it("日付が変わったら、前の日の記録は数えず新しい日の記録にする", () => {
    const storage = memoryStorage(
      JSON.stringify({ date: "2026-10-17", bests: { nami: 9_000 } }),
    );
    expect(recordDailyBest(storage, "2026-10-18", "nami", -200)).toEqual({
      best: -200,
      isUpdated: true,
      dateKey: "2026-10-18",
    });
    expect(JSON.parse(storage.saved() ?? "null")).toEqual({
      date: "2026-10-18",
      bests: { nami: -200 },
    });
  });

  it("壊れた値は記録が無いものとして扱う", () => {
    const storage = memoryStorage("{broken");
    expect(recordDailyBest(storage, "2026-10-18", "nami", 100).isUpdated).toBe(
      true,
    );
  });

  it("読み出しに失敗したら、記録が無いものとして扱い、上書きもしない", () => {
    const setItem = jest.fn();
    const storage: PersonalBestStorage = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem,
    };
    expect(recordDailyBest(storage, "2026-10-18", "nami", 100)).toEqual({
      best: 100,
      isUpdated: true,
      dateKey: "2026-10-18",
    });
    expect(setItem).not.toHaveBeenCalled();
  });

  it("保存先が無くても例外を投げない", () => {
    expect(recordDailyBest(undefined, "2026-10-18", "nami", 100).best).toBe(
      100,
    );
  });
});
