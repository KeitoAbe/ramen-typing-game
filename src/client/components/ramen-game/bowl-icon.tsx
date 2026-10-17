type Props = {
  /** のびきった丼は色をくすませる */
  isSoggy?: boolean;
};

/** カウンターに出す丼の絵。外部の素材は使わず SVG で描く */
export function BowlIcon({ isSoggy = false }: Props) {
  return (
    <svg
      viewBox="0 0 64 40"
      aria-hidden="true"
      className={`h-12 w-20 ${isSoggy ? "opacity-60 grayscale" : ""}`}
    >
      {/* 湯気 */}
      <path
        d="M24 10 q-3 -4 0 -8 M32 10 q-3 -4 0 -8 M40 10 q-3 -4 0 -8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        className="text-zinc-400"
      />
      {/* スープと麺 */}
      <ellipse cx="32" cy="16" rx="26" ry="4" className="fill-amber-300" />
      <path
        d="M14 16 q4 -3 8 0 t8 0 t8 0 t8 0 t8 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-yellow-100"
      />
      {/* 丼 */}
      <path d="M4 16 h56 a28 22 0 0 1 -56 0 z" className="fill-red-700" />
      <rect
        x="22"
        y="36"
        width="20"
        height="4"
        rx="1"
        className="fill-red-800"
      />
    </svg>
  );
}
