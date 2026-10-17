import type { RamenGameState } from "@/client/lib/ramen-game";

/** 演出や効果音のきっかけになる、プレイ中の出来事 */
export type RamenGameEvent =
  /** 正しく打った（完食したキーは served だけにする） */
  | "correct"
  /** 打ち間違えた */
  | "miss"
  /** 丼を平らげた */
  | "served"
  /** 麺がのびきって丼を下げられた */
  | "discarded"
  /** 替え玉ゲージが満タンになった */
  | "kaedama"
  /** 時間切れで閉店した */
  | "closed";

/**
 * 状態の移り変わりから、起きた出来事を取り出す。
 * reducer の状態には出来事を持たせず、前後の成績の差から読み取る
 */
export function detectGameEvents(
  prev: RamenGameState,
  next: RamenGameState,
): RamenGameEvent[] {
  if (prev.status !== "playing") return [];
  if (next.status === "closed") return ["closed"];
  // 券売機に戻ったときや、別のプレイが始まったときは何も起きていない
  if (next.status !== "playing" || next.orders !== prev.orders) return [];

  const before = prev.stats;
  const after = next.stats;
  const events: RamenGameEvent[] = [];
  if (after.discardedCount > before.discardedCount) events.push("discarded");
  if (after.missCount > before.missCount) events.push("miss");
  if (after.servedCount > before.servedCount) {
    events.push("served");
  } else if (after.correctKeyCount > before.correctKeyCount) {
    events.push("correct");
  }
  if (after.kaedamaCount > before.kaedamaCount) events.push("kaedama");
  return events;
}
