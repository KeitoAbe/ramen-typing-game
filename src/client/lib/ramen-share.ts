import {
  type Course,
  courseBalance,
  formatBalance,
} from "@/client/lib/ramen-course";
import type { PlayResult } from "@/client/lib/ramen-result";
import type { RamenTitle } from "@/client/lib/ramen-title";

/** X の投稿画面。text と url を下書きとして渡せる */
const X_POST_INTENT_URL = "https://x.com/intent/post";

/** 結果画面から X に投稿する文。コース名・称号・お会計・差し引きを入れる */
export function buildShareText(
  course: Course,
  result: Pick<PlayResult, "bill">,
  title: Pick<RamenTitle, "name">,
): string {
  const balance = courseBalance(result.bill, course);
  return [
    `ラーメン屋台タイピングで「${course.name}」の食券を使いました！`,
    `称号: ${title.name}`,
    `お会計: ${result.bill.toLocaleString("ja-JP")} 円（${formatBalance(balance)}）`,
  ].join("\n");
}

/** 投稿する文とゲームの URL を下書きにした、X の投稿画面の URL */
export function buildXShareUrl(text: string, gameUrl: string): string {
  const params = new URLSearchParams({ text, url: gameUrl });
  return `${X_POST_INTENT_URL}?${params.toString()}`;
}
