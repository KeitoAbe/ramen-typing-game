import { soggyLimitMs } from "@/client/lib/ramen-bowl";
import type { Course } from "@/client/lib/ramen-course";
import { detectGameEvents } from "@/client/lib/ramen-events";
import {
  initialRamenGameState,
  type RamenGameAction,
  type RamenGameState,
  ramenGameReducer,
} from "@/client/lib/ramen-game";
import { KAEDAMA_GAUGE_MAX } from "@/client/lib/ramen-kaedama";
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

function start(): RamenGameState {
  return ramenGameReducer(initialRamenGameState, {
    type: "start",
    course,
    orders,
    now: 0,
  });
}

/** action を 1 つ流し、その前後で起きた出来事を返す */
function eventsOf(state: RamenGameState, action: RamenGameAction) {
  return detectGameEvents(state, ramenGameReducer(state, action));
}

function typeKeys(state: RamenGameState, keys: string, now = 0) {
  let result = state;
  for (const key of keys) {
    result = ramenGameReducer(result, { type: "key", key, now });
  }
  return result;
}

describe("detectGameEvents", () => {
  it("正しく打つと correct", () => {
    expect(eventsOf(start(), { type: "key", key: "s", now: 0 })).toEqual([
      "correct",
    ]);
  });

  it("打ち間違えると miss", () => {
    expect(eventsOf(start(), { type: "key", key: "x", now: 0 })).toEqual([
      "miss",
    ]);
  });

  it("最後のキーで完食すると、correct ではなく served", () => {
    const state = typeKeys(start(), "shi");
    expect(eventsOf(state, { type: "key", key: "o", now: 0 })).toEqual([
      "served",
    ]);
  });

  it("のびきって丼が下げられると discarded", () => {
    const now = soggyLimitMs(orders[0]);
    expect(eventsOf(start(), { type: "tick", now })).toEqual(["discarded"]);
  });

  it("替え玉ゲージが満タンになった打鍵で kaedama", () => {
    // 「しお」「みそ」を交互に平らげ続け、kaedama が出た打鍵を数える
    const keys = "shiomiso".repeat(KAEDAMA_GAUGE_MAX);
    let state = start();
    const kaedamaAt: number[] = [];
    for (const [index, key] of Array.from(keys).entries()) {
      const next = ramenGameReducer(state, { type: "key", key, now: 0 });
      if (detectGameEvents(state, next).includes("kaedama")) {
        kaedamaAt.push(index + 1);
      }
      state = next;
      if (kaedamaAt.length > 0) break;
    }
    expect(kaedamaAt).toEqual([KAEDAMA_GAUGE_MAX]);
  });

  it("時間切れで閉店すると closed", () => {
    expect(
      eventsOf(start(), { type: "tick", now: course.timeLimitMs }),
    ).toEqual(["closed"]);
  });

  it("残り時間が減るだけなら何も起きない", () => {
    expect(eventsOf(start(), { type: "tick", now: 100 })).toEqual([]);
  });

  it("プレイ中でないときの変化は出来事にしない", () => {
    expect(detectGameEvents(initialRamenGameState, start())).toEqual([]);
    const closed = ramenGameReducer(start(), {
      type: "tick",
      now: course.timeLimitMs,
    });
    expect(eventsOf(closed, { type: "reset" })).toEqual([]);
  });

  it("プレイ中に券売機に戻っても何も起きない", () => {
    expect(eventsOf(start(), { type: "reset" })).toEqual([]);
  });
});
