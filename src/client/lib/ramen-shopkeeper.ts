import type { RamenGameEvent } from "@/client/lib/ramen-events";

/** 店主の表情。普段の顔・笑顔・眉が下がった顔 */
export type ShopkeeperMood = "normal" | "happy" | "troubled";

/** 変わった表情を見せておく時間。過ぎたら普段の顔に戻す */
export const SHOPKEEPER_MOOD_MS = 900;

/**
 * 起きた出来事から、店主の表情を決める。表情を変えない出来事だけなら null。
 * のびきって下げた直後に次の丼を平らげることもあるが、打った人に返す反応として完食を優先する
 */
export function shopkeeperMoodOf(
  events: readonly RamenGameEvent[],
): Exclude<ShopkeeperMood, "normal"> | null {
  if (events.includes("served")) return "happy";
  if (events.includes("miss") || events.includes("discarded")) {
    return "troubled";
  }
  return null;
}
