import { orderPrice } from "@/client/lib/ramen-result";
import { createTypingState, remainingRomaji } from "@/client/lib/romaji/typing";
import type { Order } from "@/types/order";

/** 丼が出てから、打ち始めるまでの猶予（ミリ秒） */
export const SOGGY_BASE_MS = 2_000;
/** ローマ字 1 キーあたりに足す、のびるまでの時間（ミリ秒） */
export const SOGGY_MS_PER_KEY = 1_000;

/** 出てすぐ完食したときの値段の倍率（できたての上乗せ） */
export const FRESH_PRICE_RATE = 1.2;
/** のびるまでの時間のうち、この割合を過ぎると定価より安くなる（のびかけ） */
export const SOGGY_START_RATIO = 0.5;
/** のびきる直前に完食したときの値段の倍率 */
export const MIN_PRICE_RATE = 0.5;

/**
 * 丼が出てから、のびきるまでの時間（ミリ秒）。
 * 打つキー数に比例させ、毎秒 1 キーでも間に合うようにしている
 */
export function soggyLimitMs(order: Order): number {
  const keyCount = remainingRomaji(createTypingState(order.reading)).length;
  return SOGGY_BASE_MS + keyCount * SOGGY_MS_PER_KEY;
}

/** 丼が出てからの経過時間が、のびきるまでの時間に達したか */
export function isSoggy(order: Order, elapsedMs: number): boolean {
  return elapsedMs >= soggyLimitMs(order);
}

/**
 * 丼が出てからの経過時間に応じた値段の倍率。
 * できたては定価の FRESH_PRICE_RATE 倍で、のびかけ（SOGGY_START_RATIO を過ぎたあと）に入ると
 * 定価から MIN_PRICE_RATE 倍まで下がる。のびきったら 0
 */
export function bowlPriceRate(order: Order, elapsedMs: number): number {
  const limitMs = soggyLimitMs(order);
  if (elapsedMs >= limitMs) return 0;
  const ratio = Math.max(0, elapsedMs) / limitMs;
  if (ratio <= SOGGY_START_RATIO) {
    return (
      FRESH_PRICE_RATE - (FRESH_PRICE_RATE - 1) * (ratio / SOGGY_START_RATIO)
    );
  }
  return (
    1 -
    (1 - MIN_PRICE_RATE) *
      ((ratio - SOGGY_START_RATIO) / (1 - SOGGY_START_RATIO))
  );
}

/** 完食した丼の値段（10 円単位に丸める）。のびきっていたら 0 */
export function bowlPrice(order: Order, elapsedMs: number): number {
  const price = orderPrice(order) * bowlPriceRate(order, elapsedMs);
  return Math.round(price / 10) * 10;
}
