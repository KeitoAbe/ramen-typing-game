import type { Course } from "@/client/lib/ramen-course";

type Gtag = (
  command: "event",
  eventName: string,
  params: Record<string, string>,
) => void;

declare global {
  interface Window {
    /** GA4 のタグ（gtag.js）を読み込んだときだけ生える */
    gtag?: Gtag;
  }
}

/**
 * GA4 の測定 ID（`G-XXXXXXXXXX`）を、環境変数の値から取り出す。
 * 未設定や形式の違う値のときは null を返し、タグを読み込まない
 */
export function parseGaMeasurementId(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  // インラインのスクリプトに埋め込むので、測定 ID の形をした値だけを通す
  return /^G-[A-Z0-9]+$/.test(trimmed) ? trimmed : null;
}

/** GA4 にイベントを送る。タグを読み込んでいないとき（測定 ID が未設定など）は何もしない */
function sendGaEvent(eventName: string, params: Record<string, string>): void {
  if (typeof window === "undefined") return;
  window.gtag?.("event", eventName, params);
}

function courseParams(course: Course): Record<string, string> {
  return { course_id: course.id, course_name: course.name };
}

/** プレイを始めたことを GA4 に送る */
export function trackPlayStart(course: Course): void {
  sendGaEvent("play_start", courseParams(course));
}

/** プレイを終えた（閉店した）ことを GA4 に送る */
export function trackPlayEnd(course: Course): void {
  sendGaEvent("play_end", courseParams(course));
}
