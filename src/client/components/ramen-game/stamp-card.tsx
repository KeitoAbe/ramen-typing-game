import { useEffect, useRef } from "react";
import {
  STAMPS,
  type StampCard as StampCardData,
} from "@/client/lib/ramen-stamp-card";

type Props = {
  card: StampCardData;
  onClose: () => void;
};

/**
 * 屋台のスタンプカード。押した判子は朱肉の丸い判子で、まだ押していない枠は点線の丸で、
 * 条件の説明と並べて見せる。舞台の右上の効果音の札と重ならないよう、カードは札の下から置く
 */
export function StampCard({ card, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const stamped = new Set(card.stampedIds);

  // 開いたら閉じるボタンにフォーカスを移す
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  // Escape で閉じられるようにする
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="absolute inset-0 z-20">
      {/* 背景を沈め、押すと閉じる。キーボードでは閉じるボタンと Escape で閉じる */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-yatai-night/70"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="stamp-card-title"
        className="absolute top-[14%] left-[8%] flex h-[82%] w-[84%] flex-col rounded-[0.6cqw] border-[0.35cqw] border-yatai-sumi bg-yatai-kinari px-[2cqw] py-[1.2cqw] text-yatai-sumi shadow-[0.5cqw_0.5cqw_0_rgb(0_0_0/0.4)]"
      >
        <div className="flex items-baseline gap-[1.5cqw] border-b-[0.25cqw] border-double border-yatai-sumi pb-[0.6cqw]">
          <h2
            id="stamp-card-title"
            className="font-display text-[2.6cqw] leading-tight tracking-[0.2em]"
          >
            スタンプカード
          </h2>
          <p className="text-[1.3cqw] font-bold">
            判子 {card.stampedIds.length} / {STAMPS.length} 個
          </p>
          <p className="text-[1.3cqw] font-bold">
            累計 {card.totalServedCount.toLocaleString("ja-JP")} 杯
          </p>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="ml-auto self-center rounded-[0.5cqw] border-[0.25cqw] border-yatai-sumi bg-yatai-wood px-[1.2cqw] py-[0.3cqw] text-[1.3cqw] font-bold text-yatai-kinari shadow-[0_0.3cqw_0_var(--color-yatai-wood-dark)] hover:bg-yatai-wood-light focus-visible:outline-[0.4cqw] focus-visible:outline-offset-[0.3cqw] focus-visible:outline-yatai-amber"
          >
            閉じる
          </button>
        </div>

        <ul className="grid flex-1 grid-cols-5 grid-rows-2 gap-x-[1cqw] gap-y-[0.6cqw] pt-[1cqw]">
          {STAMPS.map((stamp) => {
            const isStamped = stamped.has(stamp.id);
            return (
              <li
                key={stamp.id}
                className="flex flex-col items-center gap-[0.5cqw] text-center"
              >
                {isStamped ? (
                  <span className="flex size-[8.5cqw] rotate-[-8deg] items-center justify-center rounded-full border-[0.4cqw] border-double border-yatai-lantern px-[0.6cqw] font-display text-[1.25cqw] leading-tight text-yatai-lantern opacity-90 mix-blend-multiply">
                    {stamp.name}
                  </span>
                ) : (
                  <span className="flex size-[8.5cqw] items-center justify-center rounded-full border-[0.25cqw] border-dashed border-yatai-sumi/40 px-[0.6cqw] text-[1.25cqw] leading-tight font-bold text-yatai-sumi/50">
                    {stamp.name}
                  </span>
                )}
                <span className="sr-only">
                  {isStamped ? "押した判子" : "まだ押していない判子"}
                </span>
                <span className="text-[1.05cqw] leading-snug font-bold">
                  {stamp.condition}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
