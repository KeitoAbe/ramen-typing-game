import type { Course } from "@/client/lib/ramen-course";
import {
  emptyPlayStats,
  orderPrice,
  type PlayStats,
} from "@/client/lib/ramen-result";
import {
  createTypingState,
  inputKey,
  isComplete,
  type TypingState,
} from "@/client/lib/romaji/typing";
import type { Order } from "@/types/order";

export type RamenGameState =
  /** 券売機の前で食券を選んでいる */
  | { status: "ready" }
  | {
      status: "playing";
      course: Course;
      orders: readonly Order[];
      /** いま出ている注文の orders 内の位置 */
      orderIndex: number;
      typing: TypingState;
      stats: PlayStats;
      endsAt: number;
      remainingMs: number;
    }
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
      return { ...state, remainingMs };
    }
    case "key": {
      if (state.status !== "playing") return state;
      // 時間切れのあとに届いたキーは受け付けない
      if (action.now >= state.endsAt) return close(state.course, state.stats);
      const { state: typing, accepted } = inputKey(state.typing, action.key);
      if (!accepted) {
        return {
          ...state,
          stats: { ...state.stats, missCount: state.stats.missCount + 1 },
        };
      }
      const stats = {
        ...state.stats,
        correctKeyCount: state.stats.correctKeyCount + 1,
      };
      if (!isComplete(typing)) return { ...state, typing, stats };
      // 打ち終えたら次の注文へ。最後まで出したら最初に戻る
      const served = state.orders[state.orderIndex];
      const orderIndex = (state.orderIndex + 1) % state.orders.length;
      return {
        ...state,
        orderIndex,
        typing: createTypingState(state.orders[orderIndex].reading),
        stats: {
          ...stats,
          servedCount: stats.servedCount + 1,
          bill: stats.bill + orderPrice(served),
        },
      };
    }
  }
}
