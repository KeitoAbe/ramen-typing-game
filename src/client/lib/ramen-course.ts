import type { Order } from "@/types/order";

/** 券売機で買う食券。腕前に合わせて選ぶコース */
export type Course = {
  id: "nami" | "oomori" | "tokumori";
  name: string;
  /** 食券代（円） */
  price: number;
  timeLimitMs: number;
  /** 出す注文のよみの文字数の下限（この値を含む） */
  minReadingLength: number;
  /** 出す注文のよみの文字数の上限（この値を含む） */
  maxReadingLength: number;
};

// 丼の値段（よみ 1 文字 100 円）との釣り合いで決めた値。
// 並を平均的な腕前（毎秒 2〜3 キー）で遊んで元が取れるかどうかくらいにしている
export const COURSES: readonly Course[] = [
  {
    id: "nami",
    name: "並",
    price: 8_000,
    timeLimitMs: 60_000,
    minReadingLength: 2,
    maxReadingLength: 7,
  },
  {
    id: "oomori",
    name: "大盛り",
    price: 12_000,
    timeLimitMs: 90_000,
    minReadingLength: 5,
    maxReadingLength: 10,
  },
  {
    id: "tokumori",
    name: "特盛り",
    price: 20_000,
    timeLimitMs: 120_000,
    minReadingLength: 9,
    maxReadingLength: Number.POSITIVE_INFINITY,
  },
];

/** コースの問題の長さに合う注文だけを選ぶ */
export function ordersForCourse(
  orders: readonly Order[],
  course: Course,
): Order[] {
  return orders.filter((order) => {
    const length = Array.from(order.reading).length;
    return (
      length >= course.minReadingLength && length <= course.maxReadingLength
    );
  });
}

/** お会計から食券代を引いた差額。正ならお得、負なら損 */
export function courseBalance(bill: number, course: Course): number {
  return bill - course.price;
}

/** 差額を「◯円お得」「◯円損」の形で表す */
export function formatBalance(balance: number): string {
  const amount = Math.abs(balance).toLocaleString("ja-JP");
  return balance >= 0 ? `${amount} 円お得` : `${amount} 円損`;
}
