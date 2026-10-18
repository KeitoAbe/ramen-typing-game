import type { RamenGameState } from "@/client/lib/ramen-game";
import { STREAK_PRICE_RATES } from "@/client/lib/ramen-streak";

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
  | "closed"
  /** 「いただきます」でプレイを始めた */
  | "opened"
  /** 特別な丼（店主のおすすめ）が出た */
  | "specialBowl"
  /** 連続ボーナスの倍率が ×1.1 に上がった */
  | "streakUp1"
  /** 連続ボーナスの倍率が ×1.2 に上がった */
  | "streakUp2"
  /** 連続ボーナスの倍率が ×1.5 に上がった */
  | "streakUp3"
  /** 閉店間際に入った */
  | "closingRush";

/** 連続ボーナスの倍率が上がった出来事。倍率の低い段から順に並べる */
const STREAK_UP_EVENTS = ["streakUp1", "streakUp2", "streakUp3"] as const;

/** 連続杯数から、連続ボーナスの何段目か（倍率がかかっていなければ 0）を決める */
function streakTierOf(streak: number): number {
  return STREAK_PRICE_RATES.filter(({ from }) => streak >= from).length;
}

/**
 * 状態の移り変わりから、起きた出来事を取り出す。
 * reducer の状態には出来事を持たせず、前後の成績の差から読み取る
 */
export function detectGameEvents(
  prev: RamenGameState,
  next: RamenGameState,
): RamenGameEvent[] {
  if (prev.status !== "playing") {
    if (next.status !== "playing") return [];
    // 最初の丼が特別な丼のこともある
    return next.isSpecialBowl ? ["opened", "specialBowl"] : ["opened"];
  }
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
  const tier = streakTierOf(next.streak);
  if (tier > streakTierOf(prev.streak)) events.push(STREAK_UP_EVENTS[tier - 1]);
  // 丼が替わり、次の丼が特別な丼だった
  const isNextBowl =
    after.servedCount + after.discardedCount >
    before.servedCount + before.discardedCount;
  if (isNextBowl && next.isSpecialBowl) events.push("specialBowl");
  // 替え玉で残り時間が戻ってから、また閉店間際に入ったときも鳴らす
  if (!prev.isClosingRush && next.isClosingRush) events.push("closingRush");
  return events;
}
