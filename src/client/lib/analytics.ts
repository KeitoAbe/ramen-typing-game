import { type Course, courseBalance } from "@/client/lib/ramen-course";
import type { PlayResult } from "@/client/lib/ramen-result";
import type { RamenTitle } from "@/client/lib/ramen-title";
import type { ToppingId } from "@/client/lib/ramen-topping";

/** GA4 のイベントに付けるパラメータ。数値は数値のまま送る */
type GaEventParams = Record<string, string | number | boolean>;

type Gtag = (
  command: "event",
  eventName: string,
  params: GaEventParams,
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

/**
 * GA4 にイベントを送る。タグを読み込んでいないとき（測定 ID が未設定など）は何もしない。
 * gtag はキューに積むだけで送信は非同期に行うので、ゲームの進行を待たせない。
 * 計測の失敗でゲームを止めないよう、例外は握りつぶす
 */
function sendGaEvent(eventName: string, params: GaEventParams = {}): void {
  if (typeof window === "undefined") return;
  try {
    window.gtag?.("event", eventName, params);
  } catch {
    // 計測できなくてもゲームは続けられるので、何もしない
  }
}

function courseParams(course: Course): GaEventParams {
  return { course_id: course.id, course_name: course.name };
}

/** 選んだトッピングの id をカンマ区切りにする。何も選んでいなければ none */
function toppingsParam(toppings: readonly ToppingId[]): string {
  return toppings.length === 0 ? "none" : toppings.join(",");
}

/** 小数 1 桁に丸める */
function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

/** プレイを始めたことを GA4 に送る */
export function trackPlayStart(
  course: Course,
  toppings: readonly ToppingId[],
): void {
  sendGaEvent("play_start", {
    ...courseParams(course),
    toppings: toppingsParam(toppings),
  });
}

export type PlayEndSummary = {
  course: Course;
  toppings: readonly ToppingId[];
  result: PlayResult;
  title: RamenTitle;
  /** このプレイで自己ベストを更新したか */
  isPersonalBest: boolean;
};

/** play_end に付けるパラメータを作る */
export function playEndParams({
  course,
  toppings,
  result,
  title,
  isPersonalBest,
}: PlayEndSummary): GaEventParams {
  return {
    ...courseParams(course),
    toppings: toppingsParam(toppings),
    bill: result.bill,
    balance: courseBalance(result.bill, course),
    served_count: result.servedCount,
    discarded_count: result.discardedCount,
    miss_count: result.missCount,
    accuracy: roundToTenth(result.accuracy * 100),
    keys_per_second: roundToTenth(result.keysPerSecond),
    max_streak: result.maxStreak,
    kaedama_count: result.kaedamaCount,
    title_id: title.id,
    is_personal_best: isPersonalBest,
  };
}

/** プレイを終えた（閉店した）ことを、成績をつけて GA4 に送る */
export function trackPlayEnd(summary: PlayEndSummary): void {
  sendGaEvent("play_end", playEndParams(summary));
}

/** 結果画面で「もう一杯」を押したことを GA4 に送る */
export function trackReplay(course: Course): void {
  sendGaEvent("replay", { course_id: course.id });
}

/** 結果画面で「X で共有」を押したことを、GA4 の推奨イベント share の形で送る */
export function trackShare(course: Course): void {
  sendGaEvent("share", {
    method: "x",
    content_type: "result",
    item_id: course.id,
  });
}

/** 日本語入力がオンのまま打って、案内が出たことを GA4 に送る */
export function trackImeNoticeShown(course: Course): void {
  sendGaEvent("ime_notice_shown", { course_id: course.id });
}

/** タッチ端末で「PC のキーボードで遊んでください」の案内が出たことを GA4 に送る */
export function trackTouchNoticeShown(): void {
  sendGaEvent("touch_notice_shown");
}

/**
 * 食券を買ったあと、プレイを始めずにページを離れたことを GA4 に送る。
 * ページが閉じても届くよう、sendBeacon で送らせる
 */
export function trackTicketAbandon(course: Course): void {
  sendGaEvent("ticket_abandon", {
    course_id: course.id,
    transport_type: "beacon",
  });
}

/** 効果音のオン・オフを切り替えたことを GA4 に送る */
export function trackSoundToggle(enabled: boolean): void {
  sendGaEvent("sound_toggle", { enabled });
}
