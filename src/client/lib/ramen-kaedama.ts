/** 替え玉ゲージが満タンになるまでに、ミスなしで打つキー数 */
export const KAEDAMA_GAUGE_MAX = 30;
/** 替え玉 1 回で延びる制限時間（ミリ秒） */
export const KAEDAMA_EXTENSION_MS = 2_000;
/** 「替え玉！」を出しておく時間（ミリ秒） */
export const KAEDAMA_NOTICE_MS = 1_500;

/**
 * 正しく打ったあとの替え玉ゲージ。
 * 満タンになったら替え玉（refilled）にして、ゲージは 0 から再開する
 */
export function fillKaedamaGauge(gauge: number): {
  gauge: number;
  refilled: boolean;
} {
  const next = gauge + 1;
  if (next >= KAEDAMA_GAUGE_MAX) return { gauge: 0, refilled: true };
  return { gauge: next, refilled: false };
}

/** 制限時間に替え玉で延びた分を足した、実際のプレイ時間（ミリ秒） */
export function playTimeMs(timeLimitMs: number, kaedamaCount: number): number {
  return timeLimitMs + kaedamaCount * KAEDAMA_EXTENSION_MS;
}
