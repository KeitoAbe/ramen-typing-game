/** 残り時間がこれ以下になると「閉店間際」になる（ミリ秒） */
export const CLOSING_RUSH_THRESHOLD_MS = 15_000;
/** 閉店間際に平らげた丼の値段の倍率 */
export const CLOSING_RUSH_PRICE_RATE = 1.5;
/** 閉店間際に出た丼の、のびきるまでの時間の倍率 */
export const CLOSING_RUSH_SOGGY_RATE = 0.7;

/** 閉店までの残り時間から、閉店間際かを決める。替え玉で残り時間が戻れば通常に戻る */
export function isClosingRush(remainingMs: number): boolean {
  return remainingMs <= CLOSING_RUSH_THRESHOLD_MS;
}

/** 平らげたときに閉店間際だったかから、値段の倍率を決める */
export function closingRushPriceRate(isRush: boolean): number {
  return isRush ? CLOSING_RUSH_PRICE_RATE : 1;
}

/** 丼を出したときに閉店間際だったかから、その丼がのびきるまでの時間を決める */
export function closingRushSoggyLimitMs(
  baseLimitMs: number,
  isRush: boolean,
): number {
  return isRush ? baseLimitMs * CLOSING_RUSH_SOGGY_RATE : baseLimitMs;
}
