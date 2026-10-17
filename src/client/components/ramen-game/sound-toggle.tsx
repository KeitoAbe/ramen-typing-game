type Props = {
  enabled: boolean;
  onToggle: () => void;
};

/** 効果音のオン・オフを切り替えるボタン */
export function SoundToggle({ enabled, onToggle }: Props) {
  return (
    <button
      type="button"
      aria-pressed={enabled}
      onClick={onToggle}
      // プレイ中のキー入力でボタンが押されないよう、クリックしたらフォーカスを外す
      onMouseUp={(event) => event.currentTarget.blur()}
      className="self-end rounded-full border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700"
    >
      効果音: {enabled ? "オン" : "オフ"}
    </button>
  );
}
