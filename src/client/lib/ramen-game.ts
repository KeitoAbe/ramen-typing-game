import {
  createTypingState,
  inputKey,
  isComplete,
  type TypingState,
} from "@/client/lib/romaji/typing";
import type { Order } from "@/types/order";

export const TIME_LIMIT_MS = 60_000;

export type RamenGameState =
  | { status: "ready" }
  | {
      status: "playing";
      orders: readonly Order[];
      /** いま出ている注文の orders 内の位置 */
      orderIndex: number;
      typing: TypingState;
      /** 平らげた杯数 */
      servedCount: number;
      endsAt: number;
      remainingMs: number;
    }
  | { status: "closed"; servedCount: number };

export type RamenGameAction =
  /** orders は出す順に並べたもの（シャッフルは呼び出し側で行う） */
  | { type: "start"; orders: readonly Order[]; now: number }
  | { type: "key"; key: string; now: number }
  | { type: "tick"; now: number };

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

function close(servedCount: number): RamenGameState {
  return { status: "closed", servedCount };
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
        orders: action.orders,
        orderIndex: 0,
        typing: createTypingState(first.reading),
        servedCount: 0,
        endsAt: action.now + TIME_LIMIT_MS,
        remainingMs: TIME_LIMIT_MS,
      };
    }
    case "tick": {
      if (state.status !== "playing") return state;
      const remainingMs = Math.max(0, state.endsAt - action.now);
      if (remainingMs === 0) return close(state.servedCount);
      return { ...state, remainingMs };
    }
    case "key": {
      if (state.status !== "playing") return state;
      // 時間切れのあとに届いたキーは受け付けない
      if (action.now >= state.endsAt) return close(state.servedCount);
      const { state: typing, accepted } = inputKey(state.typing, action.key);
      if (!accepted) return state;
      if (!isComplete(typing)) return { ...state, typing };
      // 打ち終えたら次の注文へ。最後まで出したら最初に戻る
      const orderIndex = (state.orderIndex + 1) % state.orders.length;
      return {
        ...state,
        orderIndex,
        typing: createTypingState(state.orders[orderIndex].reading),
        servedCount: state.servedCount + 1,
      };
    }
  }
}
