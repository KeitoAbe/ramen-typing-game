import { bowlPrice, roundPrice, soggyLimitMs } from "@/client/lib/ramen-bowl";
import {
  CLOSING_RUSH_PRICE_RATE,
  CLOSING_RUSH_SOGGY_RATE,
  CLOSING_RUSH_THRESHOLD_MS,
} from "@/client/lib/ramen-closing-rush";
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
import { STREAK_BROKEN_NOTICE_MS } from "@/client/lib/ramen-streak";
import {
  GEKIKARA_MISS_PENALTY_MS,
  NINNIKU_SOGGY_RATE,
  TOPPING_PRICE_RATE,
  type ToppingId,
} from "@/client/lib/ramen-topping";
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
      toppings: [],
      stats: ticking.stats,
      playedMs: course.timeLimitMs,
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
    expect(late).toEqual({
      status: "closed",
      course,
      toppings: [],
      stats: emptyPlayStats,
      playedMs: course.timeLimitMs,
    });
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
      // プレイ時間は延びた分を含む
      expect(closed.playedMs).toBe(course.timeLimitMs + KAEDAMA_EXTENSION_MS);
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

    describe("何杯目かで乱数を決める（今日のお題）", () => {
      /** 0 杯目と 2 杯目だけ特別な丼にする */
      const rollForBowl = (bowlIndex: number) =>
        bowlIndex % 2 === 0 ? SPECIAL_ROLL : NORMAL_ROLL;

      function startDaily(): RamenGameState {
        return ramenGameReducer(initialRamenGameState, {
          type: "start",
          course,
          orders,
          now: 0,
          roll: NORMAL_ROLL,
          rollForBowl,
        });
      }

      it("action の乱数ではなく、何杯目かで特別な丼かが決まる", () => {
        const first = startDaily();
        if (first.status !== "playing") throw new Error("playing のはず");
        expect(first.isSpecialBowl).toBe(true);

        const second = typeKeysWith(first, "shio", 0, SPECIAL_ROLL);
        if (second.status !== "playing") throw new Error("playing のはず");
        expect(second.isSpecialBowl).toBe(false);

        const third = typeKeysWith(second, "miso", 0, NORMAL_ROLL);
        if (third.status !== "playing") throw new Error("playing のはず");
        expect(third.isSpecialBowl).toBe(true);
      });

      it("のびきって下げられた丼も 1 杯と数える", () => {
        const discarded = ramenGameReducer(startDaily(), {
          type: "tick",
          now: soggyLimitMs(orders[0]),
          roll: SPECIAL_ROLL,
        });
        if (discarded.status !== "playing") throw new Error("playing のはず");
        expect(discarded.stats.discardedCount).toBe(1);
        expect(discarded.isSpecialBowl).toBe(false);
      });
    });
  });

  describe("連続杯数", () => {
    /** しお・みそを交互に count 杯ぶん打つキー */
    function bowlKeys(count: number): string {
      return "shiomiso".repeat(Math.ceil(count / 2)).slice(0, count * 4);
    }

    function playing(state: RamenGameState) {
      if (state.status !== "playing") throw new Error("playing のはず");
      return state;
    }

    /** 出てすぐ平らげたしお・みその値段（どちらも 2 文字なので同じ） */
    const freshPrice = bowlPrice(orders[0], 0);

    it("ミスなしで平らげるたびに連続杯数が増え、最大連続杯数も記録される", () => {
      const state = playing(typeKeys(start(), bowlKeys(3)));
      expect(state.streak).toBe(3);
      expect(state.stats.maxStreak).toBe(3);
    });

    it("3 杯目から ×1.1、5 杯目から ×1.2、10 杯目から ×1.5 の値段で売れる", () => {
      const expectedRates = [1, 1, 1.1, 1.1, 1.2, 1.2, 1.2, 1.2, 1.2, 1.5, 1.5];
      let state = start();
      expectedRates.forEach((rate, index) => {
        const before = playing(state).stats.bill;
        state = typeKeys(state, bowlKeys(index + 1).slice(-4));
        expect(playing(state).stats.bill - before).toBe(
          roundPrice(freshPrice * rate),
        );
      });
    });

    it("ミスタイプすると連続杯数は 0 に戻り、その丼は平らげても連続に数えない", () => {
      const missed = playing(typeKeys(typeKeys(start(), bowlKeys(2)), "sx"));
      expect(missed.streak).toBe(0);
      expect(missed.isCleanBowl).toBe(false);

      const served = playing(typeKeys(missed, "hio"));
      expect(served.streak).toBe(0);
      expect(served.stats.maxStreak).toBe(2);

      const next = playing(typeKeys(served, "miso"));
      expect(next.streak).toBe(1);
    });

    it("丼がのびきって下げられると連続杯数は 0 に戻る", () => {
      const twoServed = playing(typeKeys(start(), bowlKeys(2)));
      const discarded = playing(
        ramenGameReducer(twoServed, {
          type: "tick",
          now: soggyLimitMs(orders[0]),
        }),
      );
      expect(discarded.stats.discardedCount).toBe(1);
      expect(discarded.streak).toBe(0);
      // 次に出た丼はミスなしで打てば連続の 1 杯目になる
      expect(discarded.isCleanBowl).toBe(true);
    });

    it("途切れると「連続が途切れた」が出て、しばらくすると消える", () => {
      const missed = playing(typeKeys(typeKeys(start(), bowlKeys(3)), "x", 0));
      expect(missed.isStreakBrokenNoticeShown).toBe(true);
      expect(missed.brokenStreak).toBe(3);

      const shown = playing(
        ramenGameReducer(missed, {
          type: "tick",
          now: STREAK_BROKEN_NOTICE_MS - 1,
        }),
      );
      expect(shown.isStreakBrokenNoticeShown).toBe(true);

      const hidden = playing(
        ramenGameReducer(shown, { type: "tick", now: STREAK_BROKEN_NOTICE_MS }),
      );
      expect(hidden.isStreakBrokenNoticeShown).toBe(false);
    });

    it("連続していないときのミスでは「連続が途切れた」は出ない", () => {
      const missed = playing(typeKeys(start(), "x"));
      expect(missed.isStreakBrokenNoticeShown).toBe(false);
    });

    it("特別な丼の倍率と掛け合わせる", () => {
      const twoServed = typeKeys(start(), bowlKeys(2).slice(0, -1));
      // 2 杯目を平らげたキーの乱数で、3 杯目を特別な丼にする
      const special = playing(
        ramenGameReducer(twoServed, { type: "key", key: "o", now: 0, roll: 0 }),
      );
      expect(special.isSpecialBowl).toBe(true);

      const served = playing(typeKeys(special, "shio"));
      expect(served.stats.bill - special.stats.bill).toBe(
        roundPrice(freshPrice * 2 * 1.1),
      );
    });
  });

  describe("日本語入力（IME）の案内", () => {
    it("開始したときは案内を出していない", () => {
      const state = start();
      if (state.status !== "playing") throw new Error("playing のはず");
      expect(state.isImeNoticeShown).toBe(false);
    });

    it("IME がオンのまま打つと案内が出て、ミスにも正しい打鍵にも数えない", () => {
      const typed = typeKeys(start(), "s");
      const ime = ramenGameReducer(typed, { type: "ime" });
      if (ime.status !== "playing" || typed.status !== "playing") {
        throw new Error("playing のはず");
      }
      expect(ime.isImeNoticeShown).toBe(true);
      expect(ime.stats).toEqual(typed.stats);
      expect(ime.kaedamaGauge).toBe(typed.kaedamaGauge);
      expect(ime.typing).toEqual(typed.typing);
    });

    it("案内が出ていても時間は進む", () => {
      const ime = ramenGameReducer(start(), { type: "ime" });
      const ticked = ramenGameReducer(ime, { type: "tick", now: 1_000 });
      if (ticked.status !== "playing") throw new Error("playing のはず");
      expect(ticked.remainingMs).toBe(course.timeLimitMs - 1_000);
      expect(ticked.orderRemainingMs).toBe(soggyLimitMs(orders[0]) - 1_000);
      expect(ticked.isImeNoticeShown).toBe(true);
    });

    it("半角英数で正しく打てたら案内は消える", () => {
      const ime = ramenGameReducer(start(), { type: "ime" });
      const typed = typeKeys(ime, "s");
      if (typed.status !== "playing") throw new Error("playing のはず");
      expect(typed.isImeNoticeShown).toBe(false);
    });

    it("ミスタイプでは案内は消えない", () => {
      const ime = ramenGameReducer(start(), { type: "ime" });
      const missed = typeKeys(ime, "x");
      if (missed.status !== "playing") throw new Error("playing のはず");
      expect(missed.stats.missCount).toBe(1);
      expect(missed.isImeNoticeShown).toBe(true);
    });

    it("プレイ中でなければ何も変えない", () => {
      expect(ramenGameReducer(initialRamenGameState, { type: "ime" })).toBe(
        initialRamenGameState,
      );
    });
  });

  describe("閉店間際", () => {
    function playing(state: RamenGameState) {
      if (state.status !== "playing") throw new Error("playing のはず");
      return state;
    }

    function startCourse(timeLimitMs: number, roll?: number): RamenGameState {
      return ramenGameReducer(initialRamenGameState, {
        type: "start",
        course: { ...course, timeLimitMs },
        orders,
        now: 0,
        roll,
      });
    }

    /** 閉店間際に入ってから出た丼の、のびきるまでの時間 */
    function rushLimitMs(order: Order) {
      return soggyLimitMs(order) * CLOSING_RUSH_SOGGY_RATE;
    }

    it("残り時間が 15 秒以下になると閉店間際になる", () => {
      const state = start();
      expect(playing(state).isClosingRush).toBe(false);
      const before = ramenGameReducer(state, {
        type: "tick",
        now: course.timeLimitMs - CLOSING_RUSH_THRESHOLD_MS - 1,
      });
      expect(playing(before).isClosingRush).toBe(false);
      const after = ramenGameReducer(before, {
        type: "tick",
        now: course.timeLimitMs - CLOSING_RUSH_THRESHOLD_MS,
      });
      expect(playing(after).isClosingRush).toBe(true);
    });

    it("替え玉で残り時間が 15 秒より長く戻ったら、通常に戻る", () => {
      // 残り 15 秒で閉店間際に入り、替え玉で 2 秒延びて残り 17 秒になる
      const rush = playing(
        ramenGameReducer(startCourse(20_000), { type: "tick", now: 5_000 }),
      );
      expect(rush.isClosingRush).toBe(true);
      const keys = "shiomiso".repeat(4).slice(0, KAEDAMA_GAUGE_MAX);
      const refilled = playing(typeKeys(rush, keys, 5_000));
      expect(refilled.stats.kaedamaCount).toBe(1);
      expect(refilled.remainingMs).toBe(15_000 + KAEDAMA_EXTENSION_MS);
      expect(refilled.isClosingRush).toBe(false);
    });

    it("閉店間際に平らげた丼の値段は ×1.5 になる", () => {
      const elapsedMs = 2_000;
      const normal = playing(typeKeys(start(), "shio", elapsedMs));
      const rush = playing(
        typeKeys(startCourse(CLOSING_RUSH_THRESHOLD_MS), "shio", elapsedMs),
      );
      expect(normal.stats.bill).toBe(bowlPrice(orders[0], elapsedMs));
      expect(rush.stats.bill).toBe(
        roundPrice(
          bowlPrice(orders[0], elapsedMs, rushLimitMs(orders[0])) *
            CLOSING_RUSH_PRICE_RATE,
        ),
      );
    });

    it("特別な丼・連続杯数の倍率と掛け合わせる", () => {
      const freshPrice = bowlPrice(orders[0], 0);
      // 2 杯平らげ、2 杯目を平らげたキーの乱数で 3 杯目を特別な丼にする
      const twoServed = typeKeys(
        startCourse(CLOSING_RUSH_THRESHOLD_MS),
        "shiomis",
      );
      const special = playing(
        ramenGameReducer(twoServed, { type: "key", key: "o", now: 0, roll: 0 }),
      );
      expect(special.isSpecialBowl).toBe(true);
      const served = playing(typeKeys(special, "shio"));
      expect(served.stats.bill - special.stats.bill).toBe(
        roundPrice(freshPrice * 2 * 1.1 * CLOSING_RUSH_PRICE_RATE),
      );
    });

    it("閉店間際に出た丼は、のびきるまでの時間が 0.7 倍になる", () => {
      const state = playing(startCourse(CLOSING_RUSH_THRESHOLD_MS));
      expect(state.orderSoggyLimitMs).toBe(rushLimitMs(orders[0]));
      expect(state.orderRemainingMs).toBe(rushLimitMs(orders[0]));

      const halfway = typeKeys(state, "shi");
      const kept = playing(
        ramenGameReducer(halfway, {
          type: "tick",
          now: rushLimitMs(orders[0]) - 1,
        }),
      );
      expect(kept.stats.discardedCount).toBe(0);
      const discarded = playing(
        ramenGameReducer(kept, { type: "tick", now: rushLimitMs(orders[0]) }),
      );
      expect(discarded.stats.discardedCount).toBe(1);
      expect(discarded.orderSoggyLimitMs).toBe(rushLimitMs(orders[1]));
    });

    it("閉店間際に入る前に出ていた丼は、のびきるまでの時間が変わらない", () => {
      // 残り 15 秒で閉店間際に入るが、0 秒に出た丼はそのまま
      const rush = playing(
        ramenGameReducer(startCourse(20_000), { type: "tick", now: 5_000 }),
      );
      expect(rush.isClosingRush).toBe(true);
      expect(rush.orderSoggyLimitMs).toBe(soggyLimitMs(orders[0]));
      expect(rush.orderRemainingMs).toBe(soggyLimitMs(orders[0]) - 5_000);

      // 平らげて次に出た丼から短くなる
      const next = playing(typeKeys(rush, "shio", 5_000));
      expect(next.orderSoggyLimitMs).toBe(rushLimitMs(orders[1]));
    });
  });

  describe("トッピング", () => {
    function playing(state: RamenGameState) {
      if (state.status !== "playing") throw new Error("playing のはず");
      return state;
    }

    function startWith(
      toppings: readonly ToppingId[],
      timeLimitMs = course.timeLimitMs,
    ): RamenGameState {
      return ramenGameReducer(initialRamenGameState, {
        type: "start",
        course: { ...course, timeLimitMs },
        toppings,
        orders,
        now: 0,
      });
    }

    it("選んだトッピングがプレイ中と閉店後に残り、省略すると何も足さない", () => {
      expect(playing(start()).toppings).toEqual([]);
      const state = startWith(["gekikara", "ninniku"]);
      expect(playing(state).toppings).toEqual(["gekikara", "ninniku"]);
      const closed = ramenGameReducer(state, {
        type: "tick",
        now: course.timeLimitMs,
      });
      if (closed.status !== "closed") throw new Error("closed のはず");
      expect(closed.toppings).toEqual(["gekikara", "ninniku"]);
    });

    describe("激辛", () => {
      it("ミスタイプするたびに残り時間が 1 秒減る", () => {
        const missed = playing(typeKeys(startWith(["gekikara"]), "xx", 1_000));
        expect(missed.stats.missCount).toBe(2);
        expect(missed.endsAt).toBe(
          course.timeLimitMs - 2 * GEKIKARA_MISS_PENALTY_MS,
        );
        expect(missed.remainingMs).toBe(
          course.timeLimitMs - 2 * GEKIKARA_MISS_PENALTY_MS - 1_000,
        );
      });

      it("激辛でなければ、ミスタイプしても残り時間は減らない", () => {
        const missed = playing(typeKeys(startWith(["ninniku"]), "x", 1_000));
        expect(missed.endsAt).toBe(course.timeLimitMs);
      });

      it("ミスで残り時間が 15 秒以下になると閉店間際になる", () => {
        const state = startWith(["gekikara"], CLOSING_RUSH_THRESHOLD_MS + 500);
        expect(playing(state).isClosingRush).toBe(false);
        expect(playing(typeKeys(state, "x")).isClosingRush).toBe(true);
      });

      it("ミスで残り時間を使い切ったら、その場で閉店する", () => {
        const almost = ramenGameReducer(startWith(["gekikara"]), {
          type: "tick",
          now: course.timeLimitMs - 500,
        });
        const closed = typeKeys(almost, "x", course.timeLimitMs - 500);
        if (closed.status !== "closed") throw new Error("closed のはず");
        expect(closed.stats.missCount).toBe(1);
        expect(closed.playedMs).toBe(course.timeLimitMs - 500);
      });

      it("プレイ時間は、ミスで減った分を除いた時間になる", () => {
        const missed = typeKeys(startWith(["gekikara"]), "xxx");
        const closed = ramenGameReducer(missed, {
          type: "tick",
          now: course.timeLimitMs - 3 * GEKIKARA_MISS_PENALTY_MS,
        });
        if (closed.status !== "closed") throw new Error("closed のはず");
        expect(closed.playedMs).toBe(
          course.timeLimitMs - 3 * GEKIKARA_MISS_PENALTY_MS,
        );
      });
    });

    describe("ニンニクマシマシ", () => {
      const garlicLimitMs = (order: Order) =>
        soggyLimitMs(order) * NINNIKU_SOGGY_RATE;

      it("どの丼も、のびきるまでの時間が 0.7 倍になる", () => {
        const state = playing(startWith(["ninniku"]));
        expect(state.orderSoggyLimitMs).toBe(garlicLimitMs(orders[0]));
        expect(state.orderRemainingMs).toBe(garlicLimitMs(orders[0]));

        const kept = playing(
          ramenGameReducer(state, {
            type: "tick",
            now: garlicLimitMs(orders[0]) - 1,
          }),
        );
        expect(kept.stats.discardedCount).toBe(0);
        const discarded = playing(
          ramenGameReducer(kept, {
            type: "tick",
            now: garlicLimitMs(orders[0]),
          }),
        );
        expect(discarded.stats.discardedCount).toBe(1);
        expect(discarded.orderSoggyLimitMs).toBe(garlicLimitMs(orders[1]));
      });

      it("閉店間際に出た丼は、閉店間際の倍率と掛け合わせる", () => {
        const state = playing(
          startWith(["ninniku"], CLOSING_RUSH_THRESHOLD_MS),
        );
        expect(state.orderSoggyLimitMs).toBe(
          garlicLimitMs(orders[0]) * CLOSING_RUSH_SOGGY_RATE,
        );
      });
    });

    describe("値段", () => {
      const freshPrice = bowlPrice(orders[0], 0);

      it.each<[string, ToppingId[], number]>([
        ["激辛", ["gekikara"], TOPPING_PRICE_RATE],
        ["ニンニクマシマシ", ["ninniku"], TOPPING_PRICE_RATE],
        [
          "両方",
          ["gekikara", "ninniku"],
          TOPPING_PRICE_RATE * TOPPING_PRICE_RATE,
        ],
      ])("%s を選ぶと、平らげた丼の値段に倍率がかかる", (_, toppings, rate) => {
        const served = playing(typeKeys(startWith(toppings), "shio"));
        expect(served.stats.bill).toBe(roundPrice(freshPrice * rate));
      });

      it("特別な丼・連続杯数・閉店間際の倍率と掛け合わせる", () => {
        // 2 杯平らげ、2 杯目を平らげたキーの乱数で 3 杯目を特別な丼にする
        const twoServed = typeKeys(
          startWith(["gekikara", "ninniku"], CLOSING_RUSH_THRESHOLD_MS),
          "shiomis",
        );
        const special = playing(
          ramenGameReducer(twoServed, {
            type: "key",
            key: "o",
            now: 0,
            roll: 0,
          }),
        );
        expect(special.isSpecialBowl).toBe(true);
        const served = playing(typeKeys(special, "shio"));
        expect(served.stats.bill - special.stats.bill).toBe(
          roundPrice(
            freshPrice *
              2 *
              1.1 *
              CLOSING_RUSH_PRICE_RATE *
              TOPPING_PRICE_RATE *
              TOPPING_PRICE_RATE,
          ),
        );
      });
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
