/** ブラウザが既定でページをスクロールさせるキー（KeyboardEvent の key） */
const PAGE_SCROLL_KEYS: ReadonlySet<string> = new Set([
  " ",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "PageUp",
  "PageDown",
  "Home",
  "End",
]);

/**
 * 押すとページがスクロールするキーか。
 * プレイ中に舞台の下の紹介へ流れていかないよう、既定の動きを止めるかどうかの判定に使う
 */
export function isPageScrollKey(key: string): boolean {
  return PAGE_SCROLL_KEYS.has(key);
}
