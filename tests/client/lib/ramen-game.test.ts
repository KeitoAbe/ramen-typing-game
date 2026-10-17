import {
  initialRamenGameState,
  type RamenGameState,
  ramenGameReducer,
  shuffleOrders,
  TIME_LIMIT_MS,
} from "@/client/lib/ramen-game";
import { emptyPlayStats, orderPrice } from "@/client/lib/ramen-result";
import type { Order } from "@/types/order";

const orders: Order[] = [
  { id: "a", text: "塩", reading: "しお" },
  { id: "b", text: "味噌", reading: "みそ" },
];

function start(now = 0): RamenGameState {
  return ramenGameReducer(initialRamenGameState, {
    type: "start",
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
  it("開始すると最初の注文が出て、残り時間は 60 秒", () => {
    const state = start();
    expect(state.status).toBe("playing");
    if (state.status !== "playing") return;
    expect(state.orders[state.orderIndex].id).toBe("a");
    expect(state.remainingMs).toBe(TIME_LIMIT_MS);
    expect(state.stats).toEqual(emptyPlayStats);
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

  it("tick で残り時間が減り、0 になると閉店して成績が残る", () => {
    const served = typeKeys(start(), "shio");
    const ticking = ramenGameReducer(served, { type: "tick", now: 30_500 });
    if (ticking.status !== "playing") throw new Error("playing のはず");
    expect(ticking.remainingMs).toBe(29_500);

    const closed = ramenGameReducer(ticking, {
      type: "tick",
      now: TIME_LIMIT_MS,
    });
    expect(closed).toEqual({ status: "closed", stats: ticking.stats });
    if (closed.status !== "closed") throw new Error("closed のはず");
    expect(closed.stats.servedCount).toBe(1);
  });

  it("閉店後や時間切れ後のキーは受け付けない", () => {
    const late = ramenGameReducer(start(), {
      type: "key",
      key: "s",
      now: TIME_LIMIT_MS,
    });
    expect(late).toEqual({ status: "closed", stats: emptyPlayStats });
    expect(ramenGameReducer(late, { type: "key", key: "s", now: 0 })).toBe(
      late,
    );
  });

  it("注文が空なら開始しない", () => {
    const state = ramenGameReducer(initialRamenGameState, {
      type: "start",
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
