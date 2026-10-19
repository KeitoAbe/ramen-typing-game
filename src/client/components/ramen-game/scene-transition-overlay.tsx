import type { Course } from "@/client/lib/ramen-course";
import type { SceneTransitionKind } from "@/client/lib/scene-transition";

type Props = {
  kind: SceneTransitionKind;
  /** 閉店のとき、まだプレイの画面のまま灯りが落ちているところか */
  isLightsDimming: boolean;
  /** 渡す食券（券売機 → トッピングのときだけ使う） */
  course: Course | null;
};

const OVERLAY = "pointer-events-none absolute inset-0 z-20 overflow-hidden";

/** 動きを抑える設定での移り変わり。夜の色の幕が薄れるだけにする */
const REDUCED_VEIL =
  "absolute inset-0 hidden bg-yatai-night-deep/70 motion-reduce:block motion-reduce:animate-scene-veil-out";

/**
 * 画面の切り替えの移り変わり。新しい画面の上に重ねて動かし、終わったら親が外す。
 * 位置・大きさ・回転・透明度だけの CSS のアニメーションで作り、動かす版は motion-safe: で付ける。
 * 動きを抑える設定では、どれも夜の色の幕が薄れるだけにする（docs/design.md の「画面の切り替え」）
 */
export function SceneTransitionOverlay({
  kind,
  isLightsDimming,
  course,
}: Props) {
  if (kind === "lights-out" && isLightsDimming) {
    // 止めたプレイの画面の上で、提灯の灯りがふっと揺らいでから落ちて、舞台が暗くなる
    return (
      <div
        aria-hidden="true"
        data-testid="scene-transition"
        className={OVERLAY}
      >
        <div className="absolute inset-0 animate-lights-out bg-yatai-night-deep/65" />
      </div>
    );
  }

  return (
    <div aria-hidden="true" data-testid="scene-transition" className={OVERLAY}>
      <div className={REDUCED_VEIL} />
      {kind === "hand-ticket" && (
        <>
          <div className="absolute inset-0 hidden bg-yatai-night-deep/70 motion-safe:block motion-safe:animate-scene-veil-out" />
          {/* 券売機の取出口から出た食券が、トッピングの画面のカウンターの食券の位置へ渡る */}
          {course && (
            <div className="absolute top-[78%] left-[4%] hidden h-[16%] w-[15.6%] animate-ticket-hand-over flex-col items-center justify-center stage-paper leading-tight motion-safe:flex">
              <span className="text-[1.25cqw] font-bold">食券</span>
              <span className="font-display text-[3cqw]">{course.name}</span>
            </div>
          )}
        </>
      )}
      {kind === "lights-out" && (
        // 灯りが落ちて暗くなった舞台が、伝票が差し出されるのに合わせて明るさを戻す
        <div className="absolute inset-0 hidden bg-yatai-night-deep/65 motion-safe:block motion-safe:animate-receipt-veil-out" />
      )}
      {kind === "back-to-machine" && (
        // 屋台の前を覆った夜の幕が右へ流れ、左の券売機の前に戻る
        <div className="absolute inset-0 hidden bg-yatai-night-deep motion-safe:block motion-safe:animate-back-to-machine" />
      )}
    </div>
  );
}
