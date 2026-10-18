import { CLOSING_RUSH_PRICE_RATE } from "@/client/lib/ramen-closing-rush";
import type { RamenGameState } from "@/client/lib/ramen-game";
import { SPECIAL_BOWL_PRICE_RATE } from "@/client/lib/ramen-special-bowl";
import { streakPriceRate } from "@/client/lib/ramen-streak";
import { toppingPriceRate } from "@/client/lib/ramen-topping";
import {
  remainingRomaji,
  type TypingState,
  typedRomaji,
} from "@/client/lib/romaji/typing";

/** いま出ている丼を、どこまで食べ進めたか（0 なら手つかず、1 なら打ち終わり） */
export function eatenRatio(typing: TypingState): number {
  const typedLength = typedRomaji(typing).length;
  const totalLength = typedLength + remainingRomaji(typing).length;
  return totalLength === 0 ? 0 : typedLength / totalLength;
}

/** 食べ進めた割合から、丼に残して見せる麺の筋の数を決める。打ち終わりで 0 本になる */
export function noodleStrandCount(ratio: number, strandTotal: number): number {
  return Math.ceil((1 - Math.min(1, Math.max(0, ratio))) * strandTotal);
}

/** 平らげた丼の値段に上乗せした倍率 */
type PriceBonus = {
  kind: "special" | "streak" | "closingRush" | "topping";
  label: string;
};

/** 丼を平らげたときに、丼のあたりから浮かび上がらせる値段 */
export type ServedPricePop = {
  /** 平らげるたびに変わる値。続けて平らげても演出をやり直すために使う */
  id: number;
  price: number;
  bonuses: readonly PriceBonus[];
};

/** 倍率を「×1.69」の形にする。小数の誤差は表示に出さない */
function rateLabel(rate: number): string {
  return `×${Math.round(rate * 100) / 100}`;
}

/**
 * 状態の移り変わりから、平らげた丼の値段と、上乗せした倍率を取り出す。
 * 値段はお会計の差で正確に出す。閉店間際だったかは直前の状態で決めるので、
 * 閉店間際に入る瞬間（tick の間隔の 0.1 秒以内）に平らげたときだけ、倍率の表示がずれることがある
 */
export function servedPricePopOf(
  prev: RamenGameState,
  next: RamenGameState,
): ServedPricePop | null {
  if (prev.status !== "playing" || next.status !== "playing") return null;
  if (prev.orders !== next.orders) return null;
  if (next.stats.servedCount <= prev.stats.servedCount) return null;

  const bonuses: PriceBonus[] = [];
  if (prev.isSpecialBowl) {
    bonuses.push({
      kind: "special",
      label: `おすすめ ${rateLabel(SPECIAL_BOWL_PRICE_RATE)}`,
    });
  }
  // 平らげたあとの連続杯数は、その丼を何杯目の連続として平らげたか（ミスした丼なら 0）
  const streakRate = streakPriceRate(next.streak);
  if (streakRate > 1) {
    bonuses.push({ kind: "streak", label: `連続 ${rateLabel(streakRate)}` });
  }
  if (prev.isClosingRush) {
    bonuses.push({
      kind: "closingRush",
      label: `閉店間際 ${rateLabel(CLOSING_RUSH_PRICE_RATE)}`,
    });
  }
  const toppingRate = toppingPriceRate(next.toppings);
  if (toppingRate > 1) {
    bonuses.push({
      kind: "topping",
      label: `トッピング ${rateLabel(toppingRate)}`,
    });
  }
  return {
    id: next.stats.servedCount,
    price: next.stats.bill - prev.stats.bill,
    bonuses,
  };
}
