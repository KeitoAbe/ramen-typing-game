/**
 * 連続杯数（ミスなし・下げられなしで続けて平らげた杯数）に応じた値段の倍率。
 * 何杯目の丼からその倍率がかかるかを、杯数の多い順に並べる
 */
export const STREAK_PRICE_RATES = [
  { from: 10, rate: 1.5 },
  { from: 5, rate: 1.2 },
  { from: 3, rate: 1.1 },
] as const;
/** 「連続が途切れた」を出しておく時間（ミリ秒） */
export const STREAK_BROKEN_NOTICE_MS = 1_500;

/** 連続の何杯目として平らげた丼か（1 杯目なら 1）から、値段の倍率を決める */
export function streakPriceRate(streak: number): number {
  return STREAK_PRICE_RATES.find(({ from }) => streak >= from)?.rate ?? 1;
}
