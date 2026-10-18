import type { Course } from "@/client/lib/ramen-course";
import { STREAK_PRICE_RATES } from "@/client/lib/ramen-streak";

/** 紹介の文章に載せる、コースの食券代・制限時間・注文の長さ */
export type CourseGuide = {
  priceLabel: string;
  timeLabel: string;
  readingLengthLabel: string;
};

/**
 * コースの設定を紹介の文章に載せる形にする。
 * 文章に数字を書き写さず、ゲームの設定から作って食い違わないようにする
 */
export function describeCourse(course: Course): CourseGuide {
  const { minReadingLength, maxReadingLength } = course;
  return {
    priceLabel: `${course.price.toLocaleString("ja-JP")} 円`,
    timeLabel: `${course.timeLimitMs / 1000} 秒`,
    readingLengthLabel: Number.isFinite(maxReadingLength)
      ? `よみ ${minReadingLength}〜${maxReadingLength} 文字`
      : `よみ ${minReadingLength} 文字以上`,
  };
}

/** 連続ボーナスの倍率を、少ない杯数から順に「3 杯目から ×1.1」の形で並べる */
export function describeStreakBonus(
  rates: readonly { from: number; rate: number }[] = STREAK_PRICE_RATES,
): string {
  return [...rates]
    .sort((a, b) => a.from - b.from)
    .map(({ from, rate }) => `${from} 杯目から ×${rate.toFixed(1)}`)
    .join("、");
}
