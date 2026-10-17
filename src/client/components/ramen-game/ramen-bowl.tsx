import type { ReactNode } from "react";
import type { BowlStyle, Soup, Topping } from "@/client/lib/ramen-bowl-style";

const SUMI = "var(--color-yatai-sumi)";

const SOUP_COLORS: Record<Soup, string> = {
  shoyu: "#b5652a",
  miso: "#d9993f",
  shio: "#f0d9a0",
  tonkotsu: "#f4ead6",
};

/** トッピングの絵。丼の座標（360×260）で描く */
const TOPPING_ART: Record<Topping, ReactNode> = {
  nori: (
    <path
      d="M62 128 L78 64 L130 74 L118 132 Z"
      fill="#1f2a22"
      stroke={SUMI}
      strokeWidth={4}
      strokeLinejoin="round"
    />
  ),
  chashu: (
    <g stroke={SUMI} strokeWidth={4}>
      <ellipse cx={226} cy={112} rx={36} ry={20} fill="#f3d3b8" />
      <ellipse
        cx={226}
        cy={112}
        rx={24}
        ry={12}
        fill="#c97f5d"
        strokeWidth={0}
      />
      <ellipse cx={270} cy={124} rx={34} ry={18} fill="#f3d3b8" />
      <ellipse
        cx={270}
        cy={124}
        rx={22}
        ry={10}
        fill="#c97f5d"
        strokeWidth={0}
      />
    </g>
  ),
  menma: (
    <g fill="#c9a35a" stroke={SUMI} strokeWidth={3}>
      <rect x={120} y={128} width={34} height={11} rx={4} />
      <rect x={140} y={138} width={34} height={11} rx={4} />
      <rect x={112} y={140} width={30} height={10} rx={4} />
    </g>
  ),
  ajitama: (
    <g stroke={SUMI} strokeWidth={4}>
      <ellipse cx={164} cy={108} rx={28} ry={18} fill="#fffaf0" />
      <ellipse
        cx={164}
        cy={108}
        rx={15}
        ry={10}
        fill="#f2a33a"
        strokeWidth={0}
      />
    </g>
  ),
  negi: (
    <g fill="#8fd16a" stroke="#3f7f2a" strokeWidth={2}>
      {[
        [190, 128],
        [204, 136],
        [178, 140],
        [216, 126],
        [196, 146],
        [170, 128],
        [224, 142],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={5} />
      ))}
    </g>
  ),
};

/** 湯気の筋。できたてほど多く出す */
const STEAM_PATHS = [
  "M180 88 q-16 -20 0 -40 q16 -20 0 -40",
  "M122 92 q-14 -18 0 -36 q14 -18 0 -34",
  "M238 92 q-14 -18 0 -36 q14 -18 0 -34",
] as const;

type Props = {
  look: BowlStyle;
  /** 麺がのびるまでの残りの割合（1 ならできたて、0 ならのびきり）。湯気の量に出す */
  freshness: number;
  /** のびかけの丼は麺がふやけてくすむ */
  isSoggy: boolean;
};

/** カウンターに出す丼の絵。外部の素材は使わず SVG で描く */
export function RamenBowl({ look, freshness, isSoggy }: Props) {
  const steamCount = Math.ceil(
    Math.min(1, Math.max(0, freshness)) * STEAM_PATHS.length,
  );
  return (
    <svg viewBox="0 0 360 260" aria-hidden="true" className="size-full">
      {/* 湯気 */}
      <g
        fill="none"
        stroke="var(--color-yatai-kinari)"
        strokeWidth={8}
        strokeLinecap="round"
        opacity={0.3 + 0.5 * freshness}
      >
        {/* 根元を支点にゆらがせる。筋ごとに間をずらして、そろって揺れないようにする */}
        {STEAM_PATHS.slice(0, steamCount).map((d, index) => (
          <path
            key={d}
            d={d}
            style={{ animationDelay: `${index * -0.6}s` }}
            className="origin-bottom [transform-box:fill-box] motion-safe:animate-steam-waver"
          />
        ))}
      </g>
      {/* 丼の縁とスープ、麺、トッピング */}
      <ellipse
        cx={180}
        cy={120}
        rx={170}
        ry={36}
        fill="var(--color-yatai-kinari)"
        stroke={SUMI}
        strokeWidth={6}
      />
      <g className={isSoggy ? "brightness-90 saturate-[0.35]" : undefined}>
        <ellipse
          cx={180}
          cy={122}
          rx={154}
          ry={28}
          fill={SOUP_COLORS[look.soup]}
        />
        <path
          d="M52 122 q16 -12 32 0 t32 0 t32 0 t32 0 t32 0 t32 0 t32 0 t32 0"
          fill="none"
          stroke={isSoggy ? "#d8c79a" : "#f7d774"}
          strokeWidth={isSoggy ? 9 : 5}
          strokeLinecap="round"
        />
        <path
          d="M76 134 q16 -10 32 0 t32 0 t32 0 t32 0 t32 0 t32 0 t32 0"
          fill="none"
          stroke={isSoggy ? "#d8c79a" : "#f7d774"}
          strokeWidth={isSoggy ? 9 : 5}
          strokeLinecap="round"
        />
        {look.toppings.map((topping) => (
          <g key={topping}>{TOPPING_ART[topping]}</g>
        ))}
      </g>
      {/* 丼の胴と雷紋の帯、高台 */}
      <path
        d="M10 122 Q18 236 180 242 Q342 236 350 122 Q180 170 10 122 Z"
        fill="var(--color-yatai-lantern)"
        stroke={SUMI}
        strokeWidth={6}
        strokeLinejoin="round"
      />
      <path
        d="M44 176 l14 -10 l14 10 l14 -10 l14 10 l14 -10 l14 10 l14 -10 l14 10 l14 -10 l14 10 l14 -10 l14 10 l14 -10 l14 10 l14 -10 l14 10 l14 -10 l14 10 l14 -10 l14 10"
        fill="none"
        stroke="var(--color-yatai-kinari)"
        strokeWidth={4}
        strokeLinejoin="round"
      />
      <rect
        x={124}
        y={236}
        width={112}
        height={20}
        rx={6}
        fill="var(--color-yatai-lantern-dark)"
        stroke={SUMI}
        strokeWidth={6}
      />
    </svg>
  );
}

/** 平らげた杯数として積み上げる、空の丼の絵 */
export function EmptyBowlIcon() {
  return (
    <svg viewBox="0 0 80 26" aria-hidden="true" className="w-full">
      <path
        d="M4 6 H76 Q72 24 40 24 Q8 24 4 6 Z"
        fill="var(--color-yatai-lantern)"
        stroke={SUMI}
        strokeWidth={3}
        strokeLinejoin="round"
      />
      <path d="M8 10 H72" stroke="var(--color-yatai-kinari)" strokeWidth={2} />
    </svg>
  );
}
