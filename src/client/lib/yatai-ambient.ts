/** 星が 1 回瞬く長さの下限（秒） */
export const STAR_TWINKLE_MIN_S = 2.4;
/** 星が 1 回瞬く長さの上限（秒） */
export const STAR_TWINKLE_MAX_S = 5.2;

// 黄金比の小数部。番号に掛けて小数部を取ると、隣り合う番号どうしの値が 0〜1 に偏りなく散らばる
const GOLDEN_RATIO_FRACTION = 0.618_034;

function fraction(value: number): number {
  return value - Math.floor(value);
}

/**
 * index 番目の星が瞬く長さと、瞬きの始まりをずらす時間（秒）。
 * 星ごとに長さと始まりを変えて、一斉に点滅しないようにする。描くたびに変わらないよう、番号だけから決める。
 * ずらす時間は負の値で、描いた瞬間から瞬きの途中にいるようにする
 */
export function starTwinkleTiming(index: number): {
  durationS: number;
  delayS: number;
} {
  const durationS =
    STAR_TWINKLE_MIN_S +
    fraction(index * GOLDEN_RATIO_FRACTION) *
      (STAR_TWINKLE_MAX_S - STAR_TWINKLE_MIN_S);
  const phase = fraction(index * GOLDEN_RATIO_FRACTION * 2 + 0.5);
  return {
    durationS: Math.round(durationS * 100) / 100,
    delayS: -Math.round(phase * durationS * 100) / 100,
  };
}
