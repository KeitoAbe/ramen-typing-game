import type { Course } from "@/client/lib/ramen-course";
import {
  initialRamenGameState,
  type RamenGameState,
  ramenGameReducer,
  shuffleOrders,
} from "@/client/lib/ramen-game";
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
      orderPrice(orders[0]) + orderPrice(orders[1]),
    );
  });

  it("正しいキーとミスタイプを数える", () => {
    const state = typeKeys(start(), "sxhio");
    if (state.status !== "playing") throw new Error("playing のはず");
    expect(state.stats.correctKeyCount).toBe(4);
    expect(state.stats.missCount).toBe(1);
  });

  it("間違えたキーではミスタイプ数だけが増える", () => {
    const state = start();
    const missed = typeKeys(state, "x");
    if (state.status !== "playing" || missed.status !== "playing") {
      throw new Error("playing のはず");
    }
    expect(missed.typing).toBe(state.typing);
    expect(missed.stats).toEqual({ ...state.stats, missCount: 1 });
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
