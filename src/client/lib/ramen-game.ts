import {
  bowlPrice,
  isSoggy,
  roundPrice,
  soggyLimitMs,
} from "@/client/lib/ramen-bowl";
import {
  closingRushPriceRate,
  closingRushSoggyLimitMs,
  isClosingRush,
} from "@/client/lib/ramen-closing-rush";
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
  STREAK_BROKEN_NOTICE_MS,
  streakPriceRate,
} from "@/client/lib/ramen-streak";
import {
  type ToppingId,
  toppingMissPenaltyMs,
  toppingPriceRate,
  toppingSoggyLimitMs,
} from "@/client/lib/ramen-topping";
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
  /** 食券のあとに足したトッピング */
  toppings: readonly ToppingId[];
  /** 開店（プレイを始めた）時刻 */
  startedAt: number;
  orders: readonly Order[];
  /** いま出ている注文の orders 内の位置 */
  orderIndex: number;
  /** いま出ている丼が出た時刻 */
  orderServedAt: number;
  /** いま出ている丼が、出てからのびきるまでの時間（ニンニクマシマシや閉店間際に出た丼は短い） */
  orderSoggyLimitMs: number;
  /** いま出ている丼がのびきるまでの残り時間 */
  orderRemainingMs: number;
  /** いま出ている丼が「店主のおすすめ」の特別な丼か */
  isSpecialBowl: boolean;
  typing: TypingState;
  stats: PlayStats;
  /** 替え玉で延びた分と、激辛のミスで減った分を含む、閉店の時刻 */
  endsAt: number;
  remainingMs: number;
  /** いま「閉店間際」か（残り時間が少なく、丼が高く売れるが早くのびる） */
  isClosingRush: boolean;
  /** ミスなしで続けて打ったキー数（替え玉ゲージ） */
  kaedamaGauge: number;
  /** 「替え玉！」を出しておく期限の時刻 */
  kaedamaNoticeUntil: number;
  /** いま「替え玉！」を出しているか */
  isKaedamaNoticeShown: boolean;
  /** ミスなし・下げられなしで続けて平らげた杯数（連続杯数） */
  streak: number;
  /** いま出ている丼を、まだミスなしで打てているか。ミスした丼は平らげても連続に数えない */
  isCleanBowl: boolean;
  /** 最後に途切れた連続杯数（「連続が途切れた」に出す） */
  brokenStreak: number;
  /** 「連続が途切れた」を出しておく期限の時刻 */
  streakBrokenNoticeUntil: number;
  /** いま「連続が途切れた」を出しているか */
  isStreakBrokenNoticeShown: boolean;
  /** いま「半角英数に切り替えて」の案内を出しているか（IME がオンのまま打ったら出し、正しく打てたら消す） */
  isImeNoticeShown: boolean;
};

export type RamenGameState =
  /** 券売機の前で食券を選んでいる */
  | { status: "ready" }
  | PlayingState
  | {
      status: "closed";
      course: Course;
      toppings: readonly ToppingId[];
      stats: PlayStats;
      /** 開店から閉店までの、実際のプレイ時間（ミリ秒） */
      playedMs: number;
    };

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
      /** 食券のあとに足したトッピング。省略したら何も足さない */
      toppings?: readonly ToppingId[];
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

/** closedAt に閉店する。プレイ時間は開店からそこまで */
function close(state: PlayingState, closedAt: number): RamenGameState {
  return {
    status: "closed",
    course: state.course,
    toppings: state.toppings,
    stats: state.stats,
    playedMs: closedAt - state.startedAt,
  };
}

function currentOrder(state: PlayingState): Order {
  return state.orders[state.orderIndex];
}

function isSpecialRoll(roll: number | undefined): boolean {
  return roll !== undefined && isSpecialBowlRoll(roll);
}

/**
 * 丼を出すときに、その丼がのびきるまでの時間を決める。
 * ニンニクマシマシと、閉店間際に出た丼は早くのびる（両方なら掛け合わせる）
 */
function servedSoggyLimitMs(
  order: Order,
  toppings: readonly ToppingId[],
  endsAt: number,
  now: number,
): number {
  return closingRushSoggyLimitMs(
    toppingSoggyLimitMs(soggyLimitMs(order), toppings),
    isClosingRush(endsAt - now),
  );
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
  const orderSoggyLimitMs = servedSoggyLimitMs(
    order,
    state.toppings,
    state.endsAt,
    now,
  );
  return {
    ...state,
    orderIndex,
    orderServedAt: now,
    orderSoggyLimitMs,
    orderRemainingMs: orderSoggyLimitMs,
    isSpecialBowl: isSpecialRoll(roll),
    isCleanBowl: true,
    typing: createTypingState(order.reading),
    stats,
  };
}

/**
 * ミスや丼を下げられたことで、連続杯数を 0 に戻す。
 * 続いていた連続があれば「連続が途切れた」を出す
 */
function breakStreak(state: PlayingState, now: number): PlayingState {
  const broken = { ...state, streak: 0, isCleanBowl: false };
  if (state.streak === 0) return broken;
  return {
    ...broken,
    brokenStreak: state.streak,
    streakBrokenNoticeUntil: now + STREAK_BROKEN_NOTICE_MS,
    isStreakBrokenNoticeShown: true,
  };
}

/** のびきっていれば丼を下げて次の丼を出す。お会計には入れず、連続も途切れる */
function discardIfSoggy(
  state: PlayingState,
  now: number,
  roll: number | undefined,
): PlayingState {
  const elapsedMs = now - state.orderServedAt;
  if (!isSoggy(currentOrder(state), elapsedMs, state.orderSoggyLimitMs)) {
    return state;
  }
  return serveNext(
    breakStreak(state, now),
    { ...state.stats, discardedCount: state.stats.discardedCount + 1 },
    now,
    roll,
  );
}

/** いま出ている丼がのびきるまでの残り時間を、現在時刻に合わせる */
function updateOrderRemaining(state: PlayingState, now: number): PlayingState {
  const orderRemainingMs = Math.max(
    0,
    state.orderServedAt + state.orderSoggyLimitMs - now,
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
    isClosingRush: isClosingRush(endsAt - now),
    kaedamaNoticeUntil: now + KAEDAMA_NOTICE_MS,
    isKaedamaNoticeShown: true,
    stats: { ...state.stats, kaedamaCount: state.stats.kaedamaCount + 1 },
  };
}

/** 激辛なら、ミスタイプで残り時間を減らす。使い切ったらその場で閉店する */
function penalizeMiss(state: PlayingState, now: number): RamenGameState {
  const penaltyMs = toppingMissPenaltyMs(state.toppings);
  if (penaltyMs === 0) return state;
  const endsAt = state.endsAt - penaltyMs;
  if (endsAt <= now) return close(state, now);
  return {
    ...state,
    endsAt,
    remainingMs: endsAt - now,
    isClosingRush: isClosingRush(endsAt - now),
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
      const toppings = action.toppings ?? [];
      const endsAt = action.now + action.course.timeLimitMs;
      const orderSoggyLimitMs = servedSoggyLimitMs(
        first,
        toppings,
        endsAt,
        action.now,
      );
      return {
        status: "playing",
        course: action.course,
        toppings,
        startedAt: action.now,
        orders: action.orders,
        orderIndex: 0,
        orderServedAt: action.now,
        orderSoggyLimitMs,
        orderRemainingMs: orderSoggyLimitMs,
        isSpecialBowl: isSpecialRoll(action.roll),
        typing: createTypingState(first.reading),
        stats: emptyPlayStats,
        endsAt,
        remainingMs: action.course.timeLimitMs,
        isClosingRush: isClosingRush(action.course.timeLimitMs),
        kaedamaGauge: 0,
        kaedamaNoticeUntil: action.now,
        isKaedamaNoticeShown: false,
        streak: 0,
        isCleanBowl: true,
        brokenStreak: 0,
        streakBrokenNoticeUntil: action.now,
        isStreakBrokenNoticeShown: false,
        isImeNoticeShown: false,
      };
    }
    case "reset":
      return initialRamenGameState;
    case "tick": {
      if (state.status !== "playing") return state;
      const remainingMs = Math.max(0, state.endsAt - action.now);
      if (remainingMs === 0) return close(state, state.endsAt);
      const next = updateOrderRemaining(
        discardIfSoggy(state, action.now, action.roll),
        action.now,
      );
      return {
        ...next,
        remainingMs,
        isClosingRush: isClosingRush(remainingMs),
        isKaedamaNoticeShown: action.now < next.kaedamaNoticeUntil,
        isStreakBrokenNoticeShown: action.now < next.streakBrokenNoticeUntil,
      };
    }
    case "ime":
      // 案内を出すだけで、時間の進みや打った数には触れない
      if (state.status !== "playing") return state;
      return { ...state, isImeNoticeShown: true };
    case "key": {
      if (state.status !== "playing") return state;
      // 時間切れのあとに届いたキーは受け付けない
      if (action.now >= state.endsAt) return close(state, state.endsAt);
      // tick より先にキーが届いても、のびきった丼には打たせず、残り時間も今の時刻に合わせる
      const current = updateOrderRemaining(
        discardIfSoggy(state, action.now, action.roll),
        action.now,
      );
      const { state: typing, accepted } = inputKey(current.typing, action.key);
      if (!accepted) {
        // ミスすると替え玉ゲージと連続杯数は 0 に戻る。
        // 打つべきだったキーは、画面に出ている残りのローマ字の先頭（プレイヤーが見ていたもの）で数える
        const missed: PlayingState = {
          ...breakStreak(current, action.now),
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
        return penalizeMiss(missed, action.now);
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
      // 特別な丼・連続杯数・閉店間際・トッピングの倍率は、その値段に掛け合わせる。
      // 閉店間際かは、このキーで替え玉になる前の残り時間で決める（平らげた瞬間は閉店間際だったため）
      const streak = current.isCleanBowl ? current.streak + 1 : 0;
      const order = currentOrder(current);
      const price = roundPrice(
        bowlPrice(
          order,
          action.now - current.orderServedAt,
          current.orderSoggyLimitMs,
        ) *
          specialBowlPriceRate(current.isSpecialBowl) *
          streakPriceRate(streak) *
          closingRushPriceRate(isClosingRush(current.endsAt - action.now)) *
          toppingPriceRate(current.toppings),
      );
      return serveNext(
        { ...afterKey, streak },
        {
          ...stats,
          servedCount: stats.servedCount + 1,
          specialServedCount:
            stats.specialServedCount + (current.isSpecialBowl ? 1 : 0),
          bill: stats.bill + price,
          maxStreak: Math.max(stats.maxStreak, streak),
          servedBowls: [...stats.servedBowls, { order, price }],
        },
        action.now,
        action.roll,
      );
    }
  }
}
