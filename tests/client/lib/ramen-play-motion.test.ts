import { roundPrice } from "@/client/lib/ramen-bowl";
import { CLOSING_RUSH_PRICE_RATE } from "@/client/lib/ramen-closing-rush";
import type { Course } from "@/client/lib/ramen-course";
import {
  initialRamenGameState,
  type RamenGameState,
  ramenGameReducer,
} from "@/client/lib/ramen-game";
import {
  eatenRatio,
  noodleStrandCount,
  servedPricePopOf,
} from "@/client/lib/ramen-play-motion";
import type { ToppingId } from "@/client/lib/ramen-topping";
import { createTypingState, inputKey } from "@/client/lib/romaji/typing";
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

type PlayingState = Extract<RamenGameState, { status: "playing" }>;

/** 始めた時点で閉店間際（残り 15 秒以下）になるコース */
const closingRushCourse: Course = { ...course, timeLimitMs: 10_000 };

function start(
  toppings: readonly ToppingId[] = [],
  startCourse: Course = course,
): PlayingState {
  const state = ramenGameReducer(initialRamenGameState, {
    type: "start",
    course: startCourse,
    toppings,
    orders,
    now: 0,
  });
  if (state.status !== "playing") throw new Error("プレイが始まらない");
  return state;
}

function typeKeys(state: RamenGameState, keys: string): RamenGameState {
  let result = state;
  for (const key of keys) {
    result = ramenGameReducer(result, { type: "key", key, now: 0 });
  }
  return result;
}

describe("eatenRatio", () => {
  it("打ったローマ字の割合を返す", () => {
    const typing = createTypingState("しお");
    expect(eatenRatio(typing)).toBe(0);
    const afterShi = inputKey(inputKey(typing, "s").state, "i").state;
    expect(eatenRatio(afterShi)).toBeCloseTo(2 / 3);
  });
});

describe("noodleStrandCount", () => {
  it("食べ進めるほど麺の筋が減り、打ち終わりで 0 本になる", () => {
    expect(noodleStrandCount(0, 4)).toBe(4);
    expect(noodleStrandCount(0.3, 4)).toBe(3);
    expect(noodleStrandCount(0.9, 4)).toBe(1);
    expect(noodleStrandCount(1, 4)).toBe(0);
  });
});

describe("servedPricePopOf", () => {
  it("平らげていなければ null", () => {
    const state = start();
    expect(servedPricePopOf(state, typeKeys(state, "s"))).toBeNull();
  });

  it("平らげたら、お会計に足した値段を返す。倍率がかからなければ上乗せはない", () => {
    const before = typeKeys(start(), "shi");
    const after = typeKeys(before, "o");
    if (after.status !== "playing") throw new Error("プレイが続かない");
    expect(servedPricePopOf(before, after)).toEqual({
      id: 1,
      price: after.stats.bill,
      bonuses: [],
    });
  });

  it("特別な丼・連続・閉店間際・トッピングの倍率を、上乗せとして並べる", () => {
    const before: PlayingState = {
      ...typeKeys(start(["gekikara", "ninniku"], closingRushCourse), "shi"),
      isSpecialBowl: true,
      streak: 9,
    } as PlayingState;
    expect(before.isClosingRush).toBe(true);
    const after = typeKeys(before, "o");
    expect(servedPricePopOf(before, after)?.bonuses).toEqual([
      { kind: "special", label: "おすすめ ×2" },
      { kind: "streak", label: "連続 ×1.5" },
      { kind: "closingRush", label: "閉店間際 ×1.5" },
      { kind: "topping", label: "トッピング ×1.69" },
    ]);
  });

  it("閉店間際に平らげたら、お会計に足した閉店間際の値段と、その倍率の表示を返す", () => {
    const normalBefore = typeKeys(start(), "shi");
    const normalPop = servedPricePopOf(
      normalBefore,
      typeKeys(normalBefore, "o"),
    );
    const rushBefore = typeKeys(start([], closingRushCourse), "shi");
    const rushPop = servedPricePopOf(rushBefore, typeKeys(rushBefore, "o"));
    if (normalPop === null) throw new Error("平らげていない");
    expect(rushPop).toEqual({
      id: 1,
      price: roundPrice(normalPop.price * CLOSING_RUSH_PRICE_RATE),
      bonuses: [{ kind: "closingRush", label: "閉店間際 ×1.5" }],
    });
  });

  it("ミスした丼は、連続の倍率を上乗せしない", () => {
    const missed = typeKeys({ ...start(), streak: 9 }, "x");
    const before = typeKeys(missed, "shi");
    const after = typeKeys(before, "o");
    expect(servedPricePopOf(before, after)?.bonuses).toEqual([]);
  });
});
