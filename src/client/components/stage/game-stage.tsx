import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** 舞台の右上の隅に置くもの（効果音の切り替えなど） */
  corner?: ReactNode;
};

/**
 * ゲームを出す 16:9 の舞台。ウィンドウに収まる大きさで画面の中央に出す。
 * 中身は舞台の幅に合わせて拡大・縮小するよう、大きさを cqw（舞台の幅の 1%）で指定する
 */
export function GameStage({ children, corner }: Props) {
  return (
    <div className="relative aspect-video w-[min(100vw,calc(100dvh*16/9))] overflow-hidden bg-yatai-night text-yatai-kinari [container-type:size]">
      {children}
      {corner && (
        <div className="absolute top-[1.5cqw] right-[1.5cqw] z-30">
          {corner}
        </div>
      )}
    </div>
  );
}
