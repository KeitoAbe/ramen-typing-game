import { type ReactNode, useId } from "react";
import type { BowlStyle, Soup, Topping } from "@/client/lib/ramen-bowl-style";
import { noodleStrandCount } from "@/client/lib/ramen-play-motion";

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

/** 麺の筋。食べ進めるほど、後ろのものから消していく */
const NOODLE_PATHS = [
  "M52 122 q16 -12 32 0 t32 0 t32 0 t32 0 t32 0 t32 0 t32 0 t32 0",
  "M76 134 q16 -10 32 0 t32 0 t32 0 t32 0 t32 0 t32 0 t32 0",
  "M64 110 q16 -10 32 0 t32 0 t32 0 t32 0 t32 0 t32 0 t32 0",
  "M96 144 q16 -8 32 0 t32 0 t32 0 t32 0 t32 0",
] as const;

/** 特別な丼の縁できらめく、星形の輝きの位置と、きらめき始めをずらす秒数 */
const SPARKLES = [
  [36, 92, 0],
  [324, 100, -0.6],
  [262, 206, -1.1],
] as const;

/** 光の筋を丼の形に切り抜くための、縁と胴の形 */
const BOWL_SHAPE_PATH =
  "M10 122 A170 36 0 0 1 350 122 Q342 236 180 242 Q18 236 10 122 Z";

type Props = {
  look: BowlStyle;
  /** 麺がのびるまでの残りの割合（1 ならできたて、0 ならのびきり）。湯気の量に出す */
  freshness: number;
  /** のびかけの丼は麺がふやけてくすむ */
  isSoggy: boolean;
  /** 食べ進めた割合（0 なら手つかず、1 なら空）。麺の量に出す */
  eatenRatio?: number;
  /** 「店主のおすすめ」の特別な丼は、光の筋が走ってきらめく */
  isSpecial?: boolean;
};

/** カウンターに出す丼の絵。外部の素材は使わず SVG で描く */
export function RamenBowl({
  look,
  freshness,
  isSoggy,
  eatenRatio = 0,
  isSpecial = false,
}: Props) {
  // 出す丼と下げる丼を同時に描くので、切り抜きの id は丼ごとに分ける
  const clipId = `bowl-shape-${useId().replace(/[^\w-]/g, "")}`;
  const steamCount = Math.ceil(
    Math.min(1, Math.max(0, freshness)) * STEAM_PATHS.length,
  );
  const noodleCount = noodleStrandCount(eatenRatio, NOODLE_PATHS.length);
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
        {/* 食べた麺は消す。消える瞬間は透明度だけを少しずつ変える */}
        {NOODLE_PATHS.map((d, index) => (
          <path
            key={d}
            d={d}
            fill="none"
            stroke={isSoggy ? "#d8c79a" : "#f7d774"}
            strokeWidth={isSoggy ? 9 : 5}
            strokeLinecap="round"
            opacity={index < noodleCount ? 1 : 0}
            className="motion-safe:transition-opacity motion-safe:duration-200"
          />
        ))}
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
      {/* 特別な丼: 丼の形に切り抜いた斜めの光の筋と、縁の輝き。動きを抑える設定では出さない
          （丼の後光と「店主のおすすめ」の札で特別な丼だと分かる） */}
      {isSpecial && (
        <g className="motion-reduce:hidden">
          <clipPath id={clipId}>
            <path d={BOWL_SHAPE_PATH} />
          </clipPath>
          <g clipPath={`url(#${clipId})`}>
            <g
              transform="translate(-160 0)"
              className="motion-safe:animate-bowl-glint"
            >
              <rect
                x={0}
                y={60}
                width={44}
                height={200}
                transform="skewX(-24)"
                fill="#fffaf0"
                opacity={0.65}
              />
            </g>
          </g>
          {SPARKLES.map(([x, y, delayS]) => (
            <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
              <path
                d="M0 -16 L4 -4 L16 0 L4 4 L0 16 L-4 4 L-16 0 L-4 -4 Z"
                fill="#fffaf0"
                stroke="var(--color-yatai-amber)"
                strokeWidth={2}
                opacity={0}
                style={{ animationDelay: `${delayS}s` }}
                className="origin-center [transform-box:fill-box] motion-safe:animate-special-sparkle"
              />
            </g>
          ))}
        </g>
      )}
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
