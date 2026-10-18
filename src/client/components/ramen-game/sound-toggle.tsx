type Props = {
  /** 何の切り替えか（「効果音」「環境音・BGM」）。札の文字になり、読み上げでもこの名前で伝わる */
  label: string;
  enabled: boolean;
  onToggle: () => void;
};

/** 効果音や環境音・BGM のオン・オフを切り替えるボタン */
export function SoundToggle({ label, enabled, onToggle }: Props) {
  return (
    <button
      type="button"
      aria-pressed={enabled}
      onClick={onToggle}
      // プレイ中のキー入力でボタンが押されないよう、クリックしたらフォーカスを外す
      onMouseUp={(event) => event.currentTarget.blur()}
      // キーボードでボタンを押す Space / Enter は、window で打鍵を受けるゲームへ伝えない
      onKeyDown={(event) => {
        if (event.key === " " || event.key === "Enter") event.stopPropagation();
      }}
      // 屋台に掛けた小さな木札に見せる
      className="rounded-[0.6cqw] border-[max(2px,0.25cqw)] border-yatai-sumi bg-yatai-wood px-[1cqw] py-[0.3cqw] text-[max(11px,1.25cqw)] font-bold whitespace-nowrap text-yatai-kinari shadow-[0_0.3cqw_0_var(--color-yatai-wood-dark)] hover:bg-yatai-wood-light"
    >
      {label}: {enabled ? "オン" : "オフ"}
    </button>
  );
}
