import { useEffect, useRef } from "react";
import { YataiScene } from "@/client/components/ramen-game/yatai-scene";
import type { RamenGameState } from "@/client/lib/ramen-game";
import { toppingNames } from "@/client/lib/ramen-topping";

type Props = {
  state: Extract<RamenGameState, { status: "waiting" }>;
};

/**
 * 「いただきます」のあと、スペースか Enter で始めるのを待つ画面。
 * 丼はまだ出さず、注文の札を置く場所に、始め方と選んだコース・トッピングを書いた紙を置く
 */
export function RamenWaiting({ state }: Props) {
  const signRef = useRef<HTMLDivElement>(null);
  const toppingNameList = toppingNames(state.toppings);

  // 「いただきます」のボタンは消えてフォーカスが外れるので、案内の紙に移して読み上げさせる
  useEffect(() => {
    signRef.current?.focus();
  }, []);

  return (
    <section className="absolute inset-0">
      <YataiScene />

      {/* 始め方の案内: 注文の札と同じ場所に置く紙。始めると、ここに最初の注文が出る */}
      <div
        ref={signRef}
        data-scene-focus
        tabIndex={-1}
        className="stage-paper absolute top-[79.5%] left-[24%] flex h-[18.5%] w-[52%] flex-col items-center justify-center gap-[0.4cqw] focus:outline-none"
      >
        <p className="text-[1.4cqw] leading-tight font-bold">
          {state.course.name}（{state.course.timeLimitMs / 1000} 秒）・
          {toppingNameList.length > 0
            ? `トッピング: ${toppingNameList.join("・")}`
            : "トッピングなし"}
        </p>
        <p className="text-[3.2cqw] leading-tight font-bold">
          <span className="text-yatai-lantern-dark">スペース</span> か{" "}
          <span className="text-yatai-lantern-dark">Enter</span> で始める
        </p>
        <p className="text-[1.4cqw] leading-tight">
          押すと最初の丼が出て、残り時間が減り始めます
        </p>
      </div>

      {/* 日本語入力の案内: プレイ中と同じく、屋根より上の夜空に掲げる札。読み上げられるよう、入れ物は常に置いておく */}
      <div
        aria-live="polite"
        className="absolute top-[1.5cqw] left-1/2 -translate-x-1/2"
      >
        {state.isImeNoticeShown && (
          <p className="stage-paper flex flex-col items-center px-[1.2cqw] py-[0.5cqw] whitespace-nowrap">
            <span className="text-[1.8cqw] leading-tight font-bold text-yatai-lantern-dark">
              日本語入力がオンになっています
            </span>
            <span className="text-[1.4cqw] leading-tight font-bold">
              半角英数（IME オフ）に切り替えてから、スペースか Enter
              を押してください
            </span>
          </p>
        )}
      </div>
    </section>
  );
}
