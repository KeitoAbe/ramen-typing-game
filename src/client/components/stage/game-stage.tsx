import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** 舞台の右上の隅に置くもの（効果音の切り替えなど） */
  corner?: ReactNode;
  /**
   * 舞台のすぐ上に置くもの（タッチ端末への案内など）。舞台の絵に重ねると隠れてしまうものを置く。
   * 横向きのスマホでは舞台の下が最初の画面に入らないので、上に置く
   */
  above?: ReactNode;
};

/**
 * ゲームを出す 16:9 の舞台。全画面にはせず、幅 960px（高さ 540px）までの大きさで出す。
 * 下に紹介があってページがスクロールするので、幅は 100vw（スクロールバーを含む）ではなく親の幅で抑える。
 * 中身は舞台の幅に合わせて拡大・縮小するよう、大きさを cqw（舞台の幅の 1%）で指定する。
 * 幅 960px で 1cqw は 9.6px なので、文字は 1.25cqw（12px）以上にする
 */
export function GameStage({ children, corner, above }: Props) {
  return (
    <>
      {above}
      <div
        data-testid="game-stage"
        className="relative aspect-video w-full max-w-[960px] overflow-hidden bg-yatai-night text-yatai-kinari [container-type:size]"
      >
        {children}
        {corner && (
          <div className="absolute top-[1.5cqw] right-[1.5cqw] z-30">
            {corner}
          </div>
        )}
      </div>
    </>
  );
}
