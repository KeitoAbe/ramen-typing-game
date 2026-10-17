import { bowlPrice, soggyLimitMs } from "@/client/lib/ramen-bowl";
import type { Course } from "@/client/lib/ramen-course";
import {
  initialRamenGameState,
  type RamenGameState,
  ramenGameReducer,
  shuffleOrders,
} from "@/client/lib/ramen-game";
import {
  KAEDAMA_EXTENSION_MS,
  KAEDAMA_GAUGE_MAX,
  KAEDAMA_NOTICE_MS,
} from "@/client/lib/ramen-kaedama";
import { emptyPlayStats, orderPrice } from "@/client/lib/ramen-result";
import type { Order } from "@/types/order";

const orders: Order[] = [
  { id: "a", text: "塩", reading: "しお" },
  { id: "b", text: "味噌", reading: "みそ" },
];

const course: Course = {
  id: "nami",
  name: "並",
  price: 800,
  timeLimitMs: 60_000,
  minReadingLength: 2,
  maxReadingLength: 7,
};

function start(now = 0): RamenGameState {
  return ramenGameReducer(initialRamenGameState, {
    type: "start",
    course,
    orders,
    now,
  });
}

function typeKeys(state: RamenGameState, keys: string, now = 0) {
  let result = state;
  for (const key of keys) {
    result = ramenGameReducer(result, { type: "key", key, now });
  }
  return result;
}

describe("ramenGameReducer", () => {
  it("開始すると最初の注文が出て、残り時間はコースの制限時間", () => {
    const state = start();
    expect(state.status).toBe("playing");
    if (state.status !== "playing") return;
    expect(state.orders[state.orderIndex].id).toBe("a");
    expect(state.course).toBe(course);
    expect(state.remainingMs).toBe(course.timeLimitMs);
    expect(state.stats).toEqual(emptyPlayStats);
  });

  it("制限時間はコースごとに変わる", () => {
    const longCourse = { ...course, timeLimitMs: 120_000 };
    const state = ramenGameReducer(initialRamenGameState, {
      type: "start",
      course: longCourse,
      orders,
      now: 0,
    });
    const ticking = ramenGameReducer(state, { type: "tick", now: 60_000 });
    if (ticking.status !== "playing") throw new Error("playing のはず");
    expect(ticking.remainingMs).toBe(60_000);
  });

  it("打ち終えるまでは同じ注文が続き、打ち終えると次の注文に替わる", () => {
    const halfway = typeKeys(start(), "shi");
    if (halfway.status !== "playing") throw new Error("playing のはず");
    expect(halfway.orderIndex).toBe(0);

    const served = typeKeys(halfway, "o");
    if (served.status !== "playing") throw new Error("playing のはず");
    expect(served.orderIndex).toBe(1);
    expect(served.stats.servedCount).toBe(1);
  });

  it("最後の注文のあとは最初に戻る", () => {
    const state = typeKeys(start(), "shiomiso");
    if (state.status !== "playing") throw new Error("playing のはず");
    expect(state.orderIndex).toBe(0);
    expect(state.stats.servedCount).toBe(2);
  });

  it("平らげた丼の値段がお会計に積み上がる", () => {
    const state = typeKeys(start(), "shiomiso");
    if (state.status !== "playing") throw new Error("playing のはず");
    expect(state.stats.bill).toBe(
      bowlPrice(orders[0], 0) + bowlPrice(orders[1], 0),
    );
  });

  it("丼の値段は、その丼が出てから完食するまでの時間で決まる", () => {
    const first = typeKeys(start(), "shio", 1_000);
    const slowMs = soggyLimitMs(orders[1]) - 1;
    const second = typeKeys(first, "miso", 1_000 + slowMs);
    if (second.status !== "playing") throw new Error("playing のはず");
    expect(second.stats.bill).toBe(
      bowlPrice(orders[0], 1_000) + bowlPrice(orders[1], slowMs),
    );
    expect(second.stats.bill).toBeLessThan(
      orderPrice(orders[0]) + orderPrice(orders[1]),
    );
  });

  it("丼がのびるまでの残り時間が tick で減る", () => {
    const state = start();
    if (state.status !== "playing") throw new Error("playing のはず");
    expect(state.orderRemainingMs).toBe(soggyLimitMs(orders[0]));

    const ticking = ramenGameReducer(state, { type: "tick", now: 1_500 });
    if (ticking.status !== "playing") throw new Error("playing のはず");
    expect(ticking.orderRemainingMs).toBe(soggyLimitMs(orders[0]) - 1_500);
  });

  it("tick が遅れても、キー入力で丼がのびるまでの残り時間が今の時刻に合う", () => {
    const limitMs = soggyLimitMs(orders[0]);
    const typed = typeKeys(start(), "s", 1_000);
    if (typed.status !== "playing") throw new Error("playing のはず");
    expect(typed.orderRemainingMs).toBe(limitMs - 1_000);

    const missed = typeKeys(typed, "x", 2_000);
    if (missed.status !== "playing") throw new Error("playing のはず");
    expect(missed.orderRemainingMs).toBe(limitMs - 2_000);
  });

  it("のびきった丼は tick で下げられて次の丼に替わり、お会計には入らない", () => {
    const halfway = typeKeys(start(), "shi");
    const limitMs = soggyLimitMs(orders[0]);
    const discarded = ramenGameReducer(halfway, { type: "tick", now: limitMs });
    if (discarded.status !== "playing") throw new Error("playing のはず");
    expect(discarded.orderIndex).toBe(1);
    expect(discarded.orderRemainingMs).toBe(soggyLimitMs(orders[1]));
    expect(discarded.typing.position).toBe(0);
    expect(discarded.stats.discardedCount).toBe(1);
    expect(discarded.stats.servedCount).toBe(0);
    expect(discarded.stats.bill).toBe(0);
  });

  it("tick より先にキーが届いても、のびきった丼は下げてから次の丼に打つ", () => {
    const halfway = typeKeys(start(), "shi");
    const late = typeKeys(halfway, "o", soggyLimitMs(orders[0]));
    if (late.status !== "playing") throw new Error("playing のはず");
    // 「o」は次の丼（みそ）の 1 文字目ではないのでミスになる
    expect(late.orderIndex).toBe(1);
    expect(late.stats.discardedCount).toBe(1);
    expect(late.stats.servedCount).toBe(0);
    expect(late.stats.missCount).toBe(1);
  });

  it("平らげた丼を、平らげた順に実際の値段つきで記録する", () => {
    const first = typeKeys(start(), "shio", 1_000);
    const slowMs = soggyLimitMs(orders[1]) - 1;
    const second = typeKeys(first, "miso", 1_000 + slowMs);
    if (second.status !== "playing") throw new Error("playing のはず");
    expect(second.stats.servedBowls).toEqual([
      { order: orders[0], price: bowlPrice(orders[0], 1_000) },
      { order: orders[1], price: bowlPrice(orders[1], slowMs) },
    ]);
  });

  it("のびきって下げられた丼は、平らげた丼に記録しない", () => {
    const halfway = typeKeys(start(), "shi");
    const discarded = ramenGameReducer(halfway, {
      type: "tick",
      now: soggyLimitMs(orders[0]),
    });
    if (discarded.status !== "playing") throw new Error("playing のはず");
    expect(discarded.stats.servedBowls).toEqual([]);
  });

  it("打ち間違えたときは、画面に出ている残りのローマ字の先頭のキーを数える", () => {
    // 「し」の 1 打目は s、「shi」で打ち始めたあとの 2 打目は h が画面に出ている
    const state = typeKeys(start(), "xsxxhio");
    if (state.status !== "playing") throw new Error("playing のはず");
    expect(state.stats.missedKeys).toEqual({ s: 1, h: 2 });
  });

  it("「si」で打ち始めたら、残りのローマ字に合わせて数える", () => {
    // 「si」と打ったあとは「お」の o が画面に出ている
    const state = typeKeys(start(), "six");
    if (state.status !== "playing") throw new Error("playing のはず");
    expect(state.stats.missedKeys).toEqual({ o: 1 });
  });

  it("正しいキーとミスタイプを数える", () => {
    const state = typeKeys(start(), "sxhio");
    if (state.status !== "playing") throw new Error("playing のはず");
    expect(state.stats.correctKeyCount).toBe(4);
    expect(state.stats.missCount).toBe(1);
  });

  it("間違えたキーではミスタイプ数と打ち間違えたキーだけが増える", () => {
    const state = start();
    const missed = typeKeys(state, "x");
    if (state.status !== "playing" || missed.status !== "playing") {
      throw new Error("playing のはず");
    }
    expect(missed.typing).toBe(state.typing);
    expect(missed.stats).toEqual({
      ...state.stats,
      missCount: 1,
      missedKeys: { s: 1 },
    });
  });

  it("tick で残り時間が減り、0 になると閉店して食券と成績が残る", () => {
    const served = typeKeys(start(), "shio");
    const ticking = ramenGameReducer(served, { type: "tick", now: 30_500 });
    if (ticking.status !== "playing") throw new Error("playing のはず");
    expect(ticking.remainingMs).toBe(29_500);

    const closed = ramenGameReducer(ticking, {
      type: "tick",
      now: course.timeLimitMs,
    });
    expect(closed).toEqual({
      status: "closed",
      course,
      stats: ticking.stats,
    });
    if (closed.status !== "closed") throw new Error("closed のはず");
    expect(closed.stats.servedCount).toBe(1);
  });

  it("閉店後や時間切れ後のキーは受け付けない", () => {
    const late = ramenGameReducer(start(), {
      type: "key",
      key: "s",
      now: course.timeLimitMs,
    });
    expect(late).toEqual({ status: "closed", course, stats: emptyPlayStats });
    expect(ramenGameReducer(late, { type: "key", key: "s", now: 0 })).toBe(
      late,
    );
  });

  it("reset で券売機（開始前）に戻る", () => {
    const closed = ramenGameReducer(start(), {
      type: "tick",
      now: course.timeLimitMs,
    });
    expect(ramenGameReducer(closed, { type: "reset" })).toBe(
      initialRamenGameState,
    );
  });

  describe("替え玉", () => {
    /** 注文どおりに count キーぶん打つ（しお・みそを交互に） */
    function correctKeys(count: number): string {
      return "shiomiso".repeat(Math.ceil(count / 8)).slice(0, count);
    }

    it("正しく打つと替え玉ゲージがたまり、ミスすると 0 に戻る", () => {
      const typed = typeKeys(start(), "shi");
      if (typed.status !== "playing") throw new Error("playing のはず");
      expect(typed.kaedamaGauge).toBe(3);

      const missed = typeKeys(typed, "x");
      if (missed.status !== "playing") throw new Error("playing のはず");
      expect(missed.kaedamaGauge).toBe(0);
    });

    it("満タンになると制限時間が延び、ゲージは 0 から再開して「替え玉！」が出る", () => {
      const before = typeKeys(
        start(),
        correctKeys(KAEDAMA_GAUGE_MAX - 1),
        1_000,
      );
      if (before.status !== "playing") throw new Error("playing のはず");
      expect(before.endsAt).toBe(course.timeLimitMs);
      expect(before.isKaedamaNoticeShown).toBe(false);

      const refilled = typeKeys(
        before,
        correctKeys(KAEDAMA_GAUGE_MAX).slice(-1),
        1_000,
      );
      if (refilled.status !== "playing") throw new Error("playing のはず");
      expect(refilled.kaedamaGauge).toBe(0);
      expect(refilled.stats.kaedamaCount).toBe(1);
      expect(refilled.endsAt).toBe(course.timeLimitMs + KAEDAMA_EXTENSION_MS);
      expect(refilled.remainingMs).toBe(
        course.timeLimitMs + KAEDAMA_EXTENSION_MS - 1_000,
      );
      expect(refilled.isKaedamaNoticeShown).toBe(true);
    });

    it("「替え玉！」はしばらくすると消える", () => {
      const refilled = typeKeys(start(), correctKeys(KAEDAMA_GAUGE_MAX), 0);
      const shown = ramenGameReducer(refilled, {
        type: "tick",
        now: KAEDAMA_NOTICE_MS - 1,
      });
      if (shown.status !== "playing") throw new Error("playing のはず");
      expect(shown.isKaedamaNoticeShown).toBe(true);

      const hidden = ramenGameReducer(shown, {
        type: "tick",
        now: KAEDAMA_NOTICE_MS,
      });
      if (hidden.status !== "playing") throw new Error("playing のはず");
      expect(hidden.isKaedamaNoticeShown).toBe(false);
    });

    it("延びた分だけ閉店が遅くなる", () => {
      const refilled = typeKeys(start(), correctKeys(KAEDAMA_GAUGE_MAX), 0);
      const extended = ramenGameReducer(refilled, {
        type: "tick",
        now: course.timeLimitMs,
      });
      expect(extended.status).toBe("playing");

      const closed = ramenGameReducer(extended, {
        type: "tick",
        now: course.timeLimitMs + KAEDAMA_EXTENSION_MS,
      });
      expect(closed.status).toBe("closed");
      if (closed.status !== "closed") throw new Error("closed のはず");
      expect(closed.stats.kaedamaCount).toBe(1);
    });

    it("途中でミスすると、満タンまでの打鍵数を数え直す", () => {
      const half = KAEDAMA_GAUGE_MAX / 2;
      const missed = typeKeys(typeKeys(start(), correctKeys(half)), "x");
      // ミスの前と合わせて満タンの打鍵数に届いても、替え玉にはならない
      const state = typeKeys(
        missed,
        correctKeys(KAEDAMA_GAUGE_MAX).slice(half),
      );
      if (state.status !== "playing") throw new Error("playing のはず");
      expect(state.stats.kaedamaCount).toBe(0);
      expect(state.kaedamaGauge).toBe(KAEDAMA_GAUGE_MAX - half);
    });
  });

  describe("店主のおすすめ（特別な丼）", () => {
    /** 特別な丼になる乱数と、ならない乱数 */
    const SPECIAL_ROLL = 0;
    const NORMAL_ROLL = 0.99;

    function startWith(roll: number): RamenGameState {
      return ramenGameReducer(initialRamenGameState, {
        type: "start",
        course,
        orders,
        now: 0,
        roll,
      });
    }

    function typeKeysWith(
      state: RamenGameState,
      keys: string,
      now: number,
      roll: number,
    ) {
      let result = state;
      for (const key of keys) {
        result = ramenGameReducer(result, { type: "key", key, now, roll });
      }
      return result;
    }

    it("乱数が確率より小さければ最初の丼が特別な丼になり、大きければならない", () => {
      const special = startWith(SPECIAL_ROLL);
      if (special.status !== "playing") throw new Error("playing のはず");
      expect(special.isSpecialBowl).toBe(true);

      const normal = startWith(NORMAL_ROLL);
      if (normal.status !== "playing") throw new Error("playing のはず");
      expect(normal.isSpecialBowl).toBe(false);
    });

    it("乱数を渡さなければ普通の丼が出る", () => {
      const state = start();
      if (state.status !== "playing") throw new Error("playing のはず");
      expect(state.isSpecialBowl).toBe(false);
    });

    it("平らげると、完食したキーの乱数で次の丼が特別な丼になるかが決まる", () => {
      const special = typeKeysWith(startWith(NORMAL_ROLL), "shio", 0, 0);
      if (special.status !== "playing") throw new Error("playing のはず");
      expect(special.orderIndex).toBe(1);
      expect(special.isSpecialBowl).toBe(true);

      const normal = typeKeysWith(startWith(SPECIAL_ROLL), "shio", 0, 0.99);
      if (normal.status !== "playing") throw new Error("playing のはず");
      expect(normal.isSpecialBowl).toBe(false);
    });

    it("特別な丼の値段は、同じ経過時間で平らげた普通の丼の 2 倍", () => {
      for (const elapsedMs of [0, soggyLimitMs(orders[0]) - 1]) {
        const special = typeKeysWith(
          startWith(SPECIAL_ROLL),
          "shio",
          elapsedMs,
          NORMAL_ROLL,
        );
        const normal = typeKeysWith(
          startWith(NORMAL_ROLL),
          "shio",
          elapsedMs,
          NORMAL_ROLL,
        );
        if (special.status !== "playing" || normal.status !== "playing") {
          throw new Error("playing のはず");
        }
        expect(normal.stats.bill).toBe(bowlPrice(orders[0], elapsedMs));
        expect(special.stats.bill).toBe(normal.stats.bill * 2);
        expect(special.stats.specialServedCount).toBe(1);
        expect(normal.stats.specialServedCount).toBe(0);
      }
    });

    it("特別な丼ものびきったら下げられ、お会計にも特別な丼の杯数にも入らない", () => {
      const halfway = typeKeysWith(startWith(SPECIAL_ROLL), "shi", 0, 0);
      const discarded = ramenGameReducer(halfway, {
        type: "tick",
        now: soggyLimitMs(orders[0]),
        roll: NORMAL_ROLL,
      });
      if (discarded.status !== "playing") throw new Error("playing のはず");
      expect(discarded.orderIndex).toBe(1);
      expect(discarded.isSpecialBowl).toBe(false);
      expect(discarded.stats.discardedCount).toBe(1);
      expect(discarded.stats.bill).toBe(0);
      expect(discarded.stats.specialServedCount).toBe(0);
    });

    it("丼が替わらない tick やキーでは、特別な丼かどうかは変わらない", () => {
      const ticking = ramenGameReducer(startWith(SPECIAL_ROLL), {
        type: "tick",
        now: 100,
        roll: NORMAL_ROLL,
      });
      const typed = typeKeysWith(ticking, "s", 100, NORMAL_ROLL);
      if (typed.status !== "playing") throw new Error("playing のはず");
      expect(typed.isSpecialBowl).toBe(true);
    });
  });

  it("注文が空なら開始しない", () => {
    const state = ramenGameReducer(initialRamenGameState, {
      type: "start",
      course,
      orders: [],
      now: 0,
    });
    expect(state).toBe(initialRamenGameState);
  });
});

describe("shuffleOrders", () => {
  it("元の配列を変えずに、同じ注文を並べ替えて返す", () => {
    const shuffled = shuffleOrders(orders, () => 0);
    expect(shuffled.map((order) => order.id)).toEqual(["b", "a"]);
    expect(orders.map((order) => order.id)).toEqual(["a", "b"]);
  });
});
