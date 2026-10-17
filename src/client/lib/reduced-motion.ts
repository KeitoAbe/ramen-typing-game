type MotionQueryTarget = {
  matchMedia?: (query: string) => { matches: boolean };
};

/**
 * 動きを抑える設定（prefers-reduced-motion）が有効か。
 * CSS の motion-safe: では済まない、動きの終わりを待つ処理を飛ばすかどうかの判定に使う
 */
export function prefersReducedMotion(
  target: MotionQueryTarget | undefined = typeof window === "undefined"
    ? undefined
    : window,
): boolean {
  return (
    target?.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
  );
}
