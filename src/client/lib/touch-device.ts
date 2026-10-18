/** 主な入力がタッチの端末（スマホ・タブレット）に当たるメディアクエリ。マウスを載せられず、指で触る */
export const TOUCH_PRIMARY_QUERY = "(hover: none) and (pointer: coarse)";

type TouchQueryTarget = {
  matchMedia?: (query: string) => { matches: boolean };
};

/**
 * 主な入力がタッチの端末か。PC のキーボードで遊ぶゲームだと案内するかどうかの判定に使う。
 * 外付けキーボードをつないだタブレットも当たるので、遊べなくするのではなく案内だけに使う
 */
export function isTouchPrimaryDevice(
  target: TouchQueryTarget | undefined = typeof window === "undefined"
    ? undefined
    : window,
): boolean {
  return target?.matchMedia?.(TOUCH_PRIMARY_QUERY).matches ?? false;
}
