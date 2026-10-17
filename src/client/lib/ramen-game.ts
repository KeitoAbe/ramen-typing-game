import { bowlPrice, isSoggy, soggyLimitMs } from "@/client/lib/ramen-bowl";
import type { Course } from "@/client/lib/ramen-course";
import { emptyPlayStats, type PlayStats } from "@/client/lib/ramen-result";
import {
  createTypingState,
  inputKey,
  isComplete,
  type TypingState,
} from "@/client/lib/romaji/typing";
import type { Order } from "@/types/order";

type PlayingState = {
  status: "playing";
  course: Course;
  orders: readonly Order[];
  /** いま出ている注文の orders 内の位置 */
  orderIndex: number;
  /** いま出ている丼が出た時刻 */
  orderServedAt: number;
  /** いま出ている丼がのびきるまでの残り時間 */
  orderRemainingMs: number;
  typing: TypingState;
  stats: PlayStats;
  endsAt: number;
  remainingMs: number;
};

export type RamenGameState =
  /** 券売機の前で食券を選んでいる */
  | { status: "ready" }
  | PlayingState
  | { status: "closed"; course: Course; stats: PlayStats };

export type RamenGameAction =
  /** orders は出す順に並べたもの（コースでの絞り込みとシャッフルは呼び出し側で行う） */
  | { type: "start"; course: Course; orders: readonly Order[]; now: number }
  | { type: "key"; key: string; now: number }
  | { type: "tick"; now: number }
  /** 券売機に戻る */
  | { type: "reset" };

export const initialRamenGameState: RamenGameState = { status: "ready" };

/** 注文を出す順に並べ替える（Fisher–Yates） */
export function shuffleOrders(
  orders: readonly Order[],
  random: () => number = Math.random,
): Order[] {
  const result = [...orders];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function close(course: Course, stats: PlayStats): RamenGameState {
  return { status: "closed", course, stats };
}

function currentOrder(state: PlayingState): Order {
  return state.orders[state.orderIndex];
}

/** 次の丼を出す。最後まで出したら最初に戻る */
function serveNext(
  state: PlayingState,
  stats: PlayStats,
  now: number,
): PlayingState {
  const orderIndex = (state.orderIndex + 1) % state.orders.length;
  const order = state.orders[orderIndex];
  return {
    ...state,
    orderIndex,
    orderServedAt: now,
    orderRemainingMs: soggyLimitMs(order),
    typing: createTypingState(order.reading),
    stats,
  };
}

/** のびきっていれば丼を下げて次の丼を出す。お会計には入れない */
function discardIfSoggy(state: PlayingState, now: number): PlayingState {
  if (!isSoggy(currentOrder(state), now - state.orderServedAt)) return state;
  return serveNext(
    state,
    { ...state.stats, discardedCount: state.stats.discardedCount + 1 },
    now,
  );
}

export function ramenGameReducer(
  state: RamenGameState,
  action: RamenGameAction,
): RamenGameState {
  switch (action.type) {
    case "start": {
      const [first] = action.orders;
      if (!first) return state;
      return {
        status: "playing",
        course: action.course,
        orders: action.orders,
        orderIndex: 0,
        orderServedAt: action.now,
        orderRemainingMs: soggyLimitMs(first),
        typing: createTypingState(first.reading),
        stats: emptyPlayStats,
        endsAt: action.now + action.course.timeLimitMs,
        remainingMs: action.course.timeLimitMs,
      };
    }
    case "reset":
      return initialRamenGameState;
    case "tick": {
      if (state.status !== "playing") return state;
      const remainingMs = Math.max(0, state.endsAt - action.now);
      if (remainingMs === 0) return close(state.course, state.stats);
      const next = discardIfSoggy(state, action.now);
      const orderRemainingMs = Math.max(
        0,
        next.orderServedAt + soggyLimitMs(currentOrder(next)) - action.now,
      );
      return { ...next, remainingMs, orderRemainingMs };
    }
    case "key": {
      if (state.status !== "playing") return state;
      // 時間切れのあとに届いたキーは受け付けない
      if (action.now >= state.endsAt) return close(state.course, state.stats);
      // tick より先にキーが届いても、のびきった丼には打たせない
      const current = discardIfSoggy(state, action.now);
      const { state: typing, accepted } = inputKey(current.typing, action.key);
      if (!accepted) {
        return {
          ...current,
          stats: { ...current.stats, missCount: current.stats.missCount + 1 },
        };
      }
      const stats = {
        ...current.stats,
        correctKeyCount: current.stats.correctKeyCount + 1,
      };
      if (!isComplete(typing)) return { ...current, typing, stats };
      // 完食したら、出てからの経過時間に応じた値段をお会計に足して次の丼へ
      const price = bowlPrice(
        currentOrder(current),
        action.now - current.orderServedAt,
      );
      return serveNext(
        current,
        {
          ...stats,
          servedCount: stats.servedCount + 1,
          bill: stats.bill + price,
        },
        action.now,
      );
    }
  }
}
