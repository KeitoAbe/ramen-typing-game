import { bowlPrice, isSoggy, soggyLimitMs } from "@/client/lib/ramen-bowl";
import type { Course } from "@/client/lib/ramen-course";
import {
  fillKaedamaGauge,
  KAEDAMA_EXTENSION_MS,
  KAEDAMA_NOTICE_MS,
} from "@/client/lib/ramen-kaedama";
import {
  countMissedKey,
  emptyPlayStats,
  type PlayStats,
} from "@/client/lib/ramen-result";
import {
  isSpecialBowlRoll,
  specialBowlPriceRate,
} from "@/client/lib/ramen-special-bowl";
import {
  createTypingState,
  inputKey,
  isComplete,
  remainingRomaji,
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
  /** いま出ている丼が「店主のおすすめ」の特別な丼か */
  isSpecialBowl: boolean;
  typing: TypingState;
  stats: PlayStats;
  /** 替え玉で延びた分を含む、閉店の時刻 */
  endsAt: number;
  remainingMs: number;
  /** ミスなしで続けて打ったキー数（替え玉ゲージ） */
  kaedamaGauge: number;
  /** 「替え玉！」を出しておく期限の時刻 */
  kaedamaNoticeUntil: number;
  /** いま「替え玉！」を出しているか */
  isKaedamaNoticeShown: boolean;
  /** いま「半角英数に切り替えて」の案内を出しているか（IME がオンのまま打ったら出し、正しく打てたら消す） */
  isImeNoticeShown: boolean;
};

export type RamenGameState =
  /** 券売機の前で食券を選んでいる */
  | { status: "ready" }
  | PlayingState
  | { status: "closed"; course: Course; stats: PlayStats };

/**
 * 丼を出すときに、特別な丼にするかを決める乱数（0 以上 1 未満）。
 * reducer を純粋に保つため、乱数は呼び出し側で引いて action に載せる。省略したら普通の丼を出す
 */
type BowlRoll = { roll?: number };

export type RamenGameAction =
  /** orders は出す順に並べたもの（コースでの絞り込みとシャッフルは呼び出し側で行う） */
  | ({
      type: "start";
      course: Course;
      orders: readonly Order[];
      now: number;
    } & BowlRoll)
  | ({ type: "key"; key: string; now: number } & BowlRoll)
  | ({ type: "tick"; now: number } & BowlRoll)
  /** 日本語入力（IME）がオンのままキーが押された。ミスには数えない */
  | { type: "ime" }
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

function isSpecialRoll(roll: number | undefined): boolean {
  return roll !== undefined && isSpecialBowlRoll(roll);
}

/** 次の丼を出す。最後まで出したら最初に戻る */
function serveNext(
  state: PlayingState,
  stats: PlayStats,
  now: number,
  roll: number | undefined,
): PlayingState {
  const orderIndex = (state.orderIndex + 1) % state.orders.length;
  const order = state.orders[orderIndex];
  return {
    ...state,
    orderIndex,
    orderServedAt: now,
    orderRemainingMs: soggyLimitMs(order),
    isSpecialBowl: isSpecialRoll(roll),
    typing: createTypingState(order.reading),
    stats,
  };
}

/** のびきっていれば丼を下げて次の丼を出す。お会計には入れない */
function discardIfSoggy(
  state: PlayingState,
  now: number,
  roll: number | undefined,
): PlayingState {
  if (!isSoggy(currentOrder(state), now - state.orderServedAt)) return state;
  return serveNext(
    state,
    { ...state.stats, discardedCount: state.stats.discardedCount + 1 },
    now,
    roll,
  );
}

/** いま出ている丼がのびきるまでの残り時間を、現在時刻に合わせる */
function updateOrderRemaining(state: PlayingState, now: number): PlayingState {
  const orderRemainingMs = Math.max(
    0,
    state.orderServedAt + soggyLimitMs(currentOrder(state)) - now,
  );
  return { ...state, orderRemainingMs };
}

/**
 * 正しく打ったぶん替え玉ゲージをためる。
 * 満タンになったら替え玉にして、制限時間を延ばし「替え玉！」を出す
 */
function refillIfGaugeFull(state: PlayingState, now: number): PlayingState {
  const { gauge, refilled } = fillKaedamaGauge(state.kaedamaGauge);
  if (!refilled) return { ...state, kaedamaGauge: gauge };
  const endsAt = state.endsAt + KAEDAMA_EXTENSION_MS;
  return {
    ...state,
    kaedamaGauge: gauge,
    endsAt,
    remainingMs: endsAt - now,
    kaedamaNoticeUntil: now + KAEDAMA_NOTICE_MS,
    isKaedamaNoticeShown: true,
    stats: { ...state.stats, kaedamaCount: state.stats.kaedamaCount + 1 },
  };
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
        isSpecialBowl: isSpecialRoll(action.roll),
        typing: createTypingState(first.reading),
        stats: emptyPlayStats,
        endsAt: action.now + action.course.timeLimitMs,
        remainingMs: action.course.timeLimitMs,
        kaedamaGauge: 0,
        kaedamaNoticeUntil: action.now,
        isKaedamaNoticeShown: false,
        isImeNoticeShown: false,
      };
    }
    case "reset":
      return initialRamenGameState;
    case "tick": {
      if (state.status !== "playing") return state;
      const remainingMs = Math.max(0, state.endsAt - action.now);
      if (remainingMs === 0) return close(state.course, state.stats);
      const next = updateOrderRemaining(
        discardIfSoggy(state, action.now, action.roll),
        action.now,
      );
      return {
        ...next,
        remainingMs,
        isKaedamaNoticeShown: action.now < next.kaedamaNoticeUntil,
      };
    }
    case "ime":
      // 案内を出すだけで、時間の進みや打った数には触れない
      if (state.status !== "playing") return state;
      return { ...state, isImeNoticeShown: true };
    case "key": {
      if (state.status !== "playing") return state;
      // 時間切れのあとに届いたキーは受け付けない
      if (action.now >= state.endsAt) return close(state.course, state.stats);
      // tick より先にキーが届いても、のびきった丼には打たせず、残り時間も今の時刻に合わせる
      const current = updateOrderRemaining(
        discardIfSoggy(state, action.now, action.roll),
        action.now,
      );
      const { state: typing, accepted } = inputKey(current.typing, action.key);
      if (!accepted) {
        // ミスすると替え玉ゲージは 0 に戻る。
        // 打つべきだったキーは、画面に出ている残りのローマ字の先頭（プレイヤーが見ていたもの）で数える
        return {
          ...current,
          kaedamaGauge: 0,
          stats: {
            ...current.stats,
            missCount: current.stats.missCount + 1,
            missedKeys: countMissedKey(
              current.stats.missedKeys,
              remainingRomaji(current.typing).charAt(0),
            ),
          },
        };
      }
      const afterKey = refillIfGaugeFull(
        {
          ...current,
          typing,
          // 半角英数で正しく打てたら、IME の案内は消す
          isImeNoticeShown: false,
          stats: {
            ...current.stats,
            correctKeyCount: current.stats.correctKeyCount + 1,
          },
        },
        action.now,
      );
      const { stats } = afterKey;
      if (!isComplete(typing)) return afterKey;
      // 完食したら、出てからの経過時間に応じた値段をお会計に足して次の丼へ。
      // 特別な丼は、その値段にさらに倍率をかける
      const order = currentOrder(current);
      const price =
        bowlPrice(order, action.now - current.orderServedAt) *
        specialBowlPriceRate(current.isSpecialBowl);
      return serveNext(
        afterKey,
        {
          ...stats,
          servedCount: stats.servedCount + 1,
          specialServedCount:
            stats.specialServedCount + (current.isSpecialBowl ? 1 : 0),
          bill: stats.bill + price,
          servedBowls: [...stats.servedBowls, { order, price }],
        },
        action.now,
        action.roll,
      );
    }
  }
}
