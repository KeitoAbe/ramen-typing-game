/** 丼が「店主のおすすめ」の特別な丼になる確率（およそ 8 杯に 1 杯） */
export const SPECIAL_BOWL_CHANCE = 1 / 8;
/** 特別な丼の値段の倍率。できたて・のびかけで増減した値段にかける */
export const SPECIAL_BOWL_PRICE_RATE = 2;

/** 0 以上 1 未満の乱数から、次に出す丼を特別な丼にするかを決める */
export function isSpecialBowlRoll(roll: number): boolean {
  return roll < SPECIAL_BOWL_CHANCE;
}

/** 特別な丼かどうかによる値段の倍率 */
export function specialBowlPriceRate(isSpecialBowl: boolean): number {
  return isSpecialBowl ? SPECIAL_BOWL_PRICE_RATE : 1;
}
