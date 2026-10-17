import type { Order } from "@/types/order";

/** よみ 1 文字あたりの丼の値段（円） */
export const PRICE_PER_KANA = 100;

/** 1 プレイのあいだに積み上げる成績 */
export type PlayStats = {
  /** 平らげた杯数 */
  servedCount: number;
  /** 平らげた杯数のうち、「店主のおすすめ」の特別な丼の数 */
  specialServedCount: number;
  /** のびきって下げられた丼の数 */
  discardedCount: number;
  /** お会計（平らげた丼の値段の合計、円） */
  bill: number;
  /** 正しく打ったキー数 */
  correctKeyCount: number;
  /** ミスタイプ数 */
  missCount: number;
  /** 替え玉の回数（替え玉ゲージが満タンになった回数） */
  kaedamaCount: number;
  /** ミスなし・下げられなしで続けて平らげた杯数の、そのプレイでの最大 */
  maxStreak: number;
};

export type PlayResult = PlayStats & {
  /** 正確率（0〜1）。1 キーも打っていなければ 0 */
  accuracy: number;
  /** 1 秒あたりの平均打鍵数（正しく打ったキーで数える） */
  keysPerSecond: number;
};

export const emptyPlayStats: PlayStats = {
  servedCount: 0,
  specialServedCount: 0,
  discardedCount: 0,
  bill: 0,
  correctKeyCount: 0,
  missCount: 0,
  kaedamaCount: 0,
  maxStreak: 0,
};

/** 丼の定価。よみが長いほど高い（完食までの時間による増減は ramen-bowl で行う） */
export function orderPrice(order: Order): number {
  return Array.from(order.reading).length * PRICE_PER_KANA;
}

export function summarizePlay(stats: PlayStats, playedMs: number): PlayResult {
  const typedCount = stats.correctKeyCount + stats.missCount;
  return {
    ...stats,
    accuracy: typedCount === 0 ? 0 : stats.correctKeyCount / typedCount,
    keysPerSecond:
      playedMs <= 0 ? 0 : stats.correctKeyCount / (playedMs / 1000),
  };
}
