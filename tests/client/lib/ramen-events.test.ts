import { soggyLimitMs } from "@/client/lib/ramen-bowl";
import { CLOSING_RUSH_THRESHOLD_MS } from "@/client/lib/ramen-closing-rush";
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

  it("プレイを始めると opened", () => {
    expect(detectGameEvents(initialRamenGameState, start())).toEqual([
      "opened",
    ]);
  });

  it("「いただきます」で始めるのを待つ間は何も起きず、スペースか Enter で始まったときに opened", () => {
    const waiting = ramenGameReducer(initialRamenGameState, {
      type: "prepare",
      course,
      orders,
    });
    expect(detectGameEvents(initialRamenGameState, waiting)).toEqual([]);
    expect(eventsOf(waiting, { type: "ime" })).toEqual([]);
    expect(eventsOf(waiting, { type: "open", now: 0 })).toEqual(["opened"]);
  });

  it("最初の丼が特別な丼なら、opened と specialBowl", () => {
    const special = ramenGameReducer(initialRamenGameState, {
      type: "start",
      course,
      orders,
      now: 0,
      roll: 0,
    });
    expect(detectGameEvents(initialRamenGameState, special)).toEqual([
      "opened",
      "specialBowl",
    ]);
  });

  it("平らげて次に特別な丼が出ると specialBowl", () => {
    const state = typeKeys(start(), "shi");
    expect(eventsOf(state, { type: "key", key: "o", now: 0, roll: 0 })).toEqual(
      ["served", "specialBowl"],
    );
  });

  it("のびきって下げられ、次に特別な丼が出ても specialBowl", () => {
    const now = soggyLimitMs(orders[0]);
    expect(eventsOf(start(), { type: "tick", now, roll: 0 })).toEqual([
      "discarded",
      "specialBowl",
    ]);
  });

  it("普通の丼が続くときは specialBowl にしない", () => {
    const state = typeKeys(start(), "shi");
    expect(
      eventsOf(state, { type: "key", key: "o", now: 0, roll: 0.99 }),
    ).toEqual(["served"]);
  });

  it.each([
    [3, "streakUp1"],
    [5, "streakUp2"],
    [10, "streakUp3"],
  ] as const)("連続 %i 杯目を平らげて倍率が上がると %s", (bowls, expected) => {
    // 「しお」「みそ」（どちらも 4 キー）を交互にミスなしで平らげ、bowls 杯目の最後のキーの手前まで打つ
    const keys = "shiomiso".repeat(bowls).slice(0, bowls * 4);
    const state = typeKeys(start(), keys.slice(0, -1));
    const events = eventsOf(state, {
      type: "key",
      key: keys.slice(-1),
      now: 0,
    });
    expect(events.filter((event) => event.startsWith("streakUp"))).toEqual([
      expected,
    ]);
  });

  it("倍率が変わらない杯数では streakUp を出さない", () => {
    // 2 杯目までは倍率がかからない
    const state = typeKeys(start(), "shiomis");
    expect(eventsOf(state, { type: "key", key: "o", now: 0 })).toEqual([
      "served",
    ]);
  });

  it("残り時間が閉店間際に入ると closingRush（1 回だけ）", () => {
    const now = course.timeLimitMs - CLOSING_RUSH_THRESHOLD_MS;
    const before = ramenGameReducer(start(), { type: "tick", now: now - 100 });
    const rush = ramenGameReducer(before, { type: "tick", now });
    expect(detectGameEvents(before, rush)).toContain("closingRush");
    expect(eventsOf(rush, { type: "tick", now: now + 100 })).not.toContain(
      "closingRush",
    );
  });

  it("プレイ中でないときの変化は出来事にしない", () => {
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
