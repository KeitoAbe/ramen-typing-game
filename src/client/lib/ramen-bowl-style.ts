import type { Order } from "@/types/order";

/** 丼のスープの種類 */
export type Soup = "shoyu" | "miso" | "shio" | "tonkotsu";

/** 丼にのせるトッピング */
export type Topping = "ajitama" | "chashu" | "negi" | "nori" | "menma";

/** カウンターに出す丼の見た目 */
export type BowlStyle = {
  soup: Soup;
  toppings: readonly Topping[];
};

// 先に書いたものほど優先する。どれにも当たらなければ醤油
const SOUP_KEYWORDS: readonly (readonly [Soup, readonly string[]])[] = [
  ["miso", ["味噌", "みそ"]],
  ["tonkotsu", ["豚骨", "とんこつ"]],
  ["shio", ["塩"]],
  ["shoyu", ["醤油", "しょうゆ"]],
];

// 並びは丼に描く順（奥から手前）
const TOPPING_KEYWORDS: readonly (readonly [Topping, readonly string[]])[] = [
  ["nori", ["海苔"]],
  ["chashu", ["チャーシュー"]],
  ["menma", ["メンマ"]],
  ["ajitama", ["味玉"]],
  ["negi", ["ネギ", "ねぎ"]],
];

const includesAny = (text: string, keywords: readonly string[]) =>
  keywords.some((keyword) => text.includes(keyword));

/**
 * 注文の文から、丼のスープとトッピングを決める。
 * よみは「しお」が別の語の一部にも出てくるので使わず、画面に出す文だけを見る
 */
export function bowlStyleOf(order: Order): BowlStyle {
  const soup =
    SOUP_KEYWORDS.find(([, keywords]) =>
      includesAny(order.text, keywords),
    )?.[0] ?? "shoyu";
  const toppings = TOPPING_KEYWORDS.filter(([, keywords]) =>
    includesAny(order.text, keywords),
  ).map(([topping]) => topping);
  return { soup, toppings };
}
