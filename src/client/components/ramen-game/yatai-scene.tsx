import type { ReactNode } from "react";
import type { ShopkeeperMood } from "@/client/lib/ramen-shopkeeper";
import { starTwinkleTiming } from "@/client/lib/yatai-ambient";

// 夜空の星の位置（舞台の座標 1280×720）。描くたびに変わらないよう固定しておく
const STARS: readonly (readonly [number, number, number])[] = [
  [40, 30, 2],
  [160, 70, 3],
  [250, 22, 2],
  [340, 60, 2],
  [430, 28, 3],
  [520, 80, 2],
  [600, 36, 2],
  [700, 72, 3],
  [780, 20, 2],
  [860, 58, 2],
  [950, 30, 3],
  [1010, 86, 2],
  [1240, 140, 2],
  [20, 160, 3],
  [1260, 300, 2],
  [12, 420, 2],
  [1250, 480, 3],
  [30, 300, 2],
];

export const SUMI = "var(--color-yatai-sumi)";
/** 絵本風の太い輪郭線 */
export const OUTLINE = {
  stroke: SUMI,
  strokeWidth: 6,
  strokeLinejoin: "round",
} as const;

type LanternProps = {
  cx: number;
  label: readonly [string, string];
  isClosingRush: boolean;
};

/** 屋根から下がる赤い提灯。閉店間際は灯りが強まって脈打つ */
function Lantern({ cx, label, isClosingRush }: LanternProps) {
  return (
    // 吊り紐の上端（cx, 200）を支点に揺らす。transform-origin は svg の座標で書く
    <g
      style={{ transformOrigin: `${cx}px 200px` }}
      className="motion-safe:animate-lantern-sway"
    >
      <circle cx={cx} cy={300} r={120} fill="url(#lantern-glow)" />
      {/* 閉店間際の強い灯り。動きを抑える設定では、脈打たずに灯ったままにする */}
      <circle
        cx={cx}
        cy={300}
        r={170}
        fill="url(#lantern-glow)"
        opacity={isClosingRush ? 1 : 0}
        style={{ transformOrigin: `${cx}px 300px` }}
        className={`motion-safe:transition-opacity motion-safe:duration-1000 ${isClosingRush ? "motion-safe:animate-lantern-flare" : ""}`}
      />
      <line x1={cx} y1={200} x2={cx} y2={232} stroke={SUMI} strokeWidth={5} />
      <ellipse
        cx={cx}
        cy={300}
        rx={54}
        ry={64}
        fill="var(--color-yatai-lantern)"
        {...OUTLINE}
      />
      {/* 竹ひごの筋 */}
      {[-40, -20, 0, 20, 40].map((dy) => (
        <path
          key={dy}
          d={`M${cx - Math.sqrt(1 - (dy / 64) ** 2) * 52} ${300 + dy} h${Math.sqrt(1 - (dy / 64) ** 2) * 104}`}
          stroke="var(--color-yatai-lantern-dark)"
          strokeWidth={3}
        />
      ))}
      <rect x={cx - 30} y={228} width={60} height={14} rx={3} fill={SUMI} />
      <rect x={cx - 30} y={358} width={60} height={14} rx={3} fill={SUMI} />
      {label.map((char, index) => (
        <text
          key={char}
          x={cx}
          y={292 + index * 40}
          textAnchor="middle"
          fontSize={34}
          fill={SUMI}
          className="font-display"
        >
          {char}
        </text>
      ))}
    </g>
  );
}

const FACE_LINE = {
  fill: "none",
  stroke: SUMI,
  strokeWidth: 5,
  strokeLinecap: "round",
} as const;

type BlinkingEyesProps = { cy: number; children: ReactNode };

/** 開いた目。目の高さ（cy）を中心に縦につぶして、ときどきまばたきする */
function BlinkingEyes({ cy, children }: BlinkingEyesProps) {
  return (
    <g
      style={{ transformOrigin: `900px ${cy}px` }}
      className="motion-safe:animate-shopkeeper-blink"
    >
      {children}
    </g>
  );
}

/** 表情ごとの眉・目・口。笑顔は目を細めているので、まばたきさせない */
const SHOPKEEPER_FACES: Record<ShopkeeperMood, ReactNode> = {
  normal: (
    <>
      <path
        d="M866 402 l22 -4 M912 398 l22 4"
        stroke={SUMI}
        strokeWidth={7}
        strokeLinecap="round"
      />
      <BlinkingEyes cy={415}>
        <circle cx={879} cy={415} r={5} fill={SUMI} />
        <circle cx={921} cy={415} r={5} fill={SUMI} />
      </BlinkingEyes>
      <path d="M884 432 q16 8 32 0" {...FACE_LINE} />
    </>
  ),
  // 眉を上げ、目を細めて口を大きく開けて笑う
  happy: (
    <>
      <path
        d="M866 396 l22 -6 M912 390 l22 6"
        stroke={SUMI}
        strokeWidth={7}
        strokeLinecap="round"
      />
      <path d="M870 416 q9 -9 18 0 M912 416 q9 -9 18 0" {...FACE_LINE} />
      <path
        d="M880 428 q20 24 40 0 z"
        fill="var(--color-yatai-lantern-dark)"
        stroke={SUMI}
        strokeWidth={5}
        strokeLinejoin="round"
      />
    </>
  ),
  // 眉尻を下げ（ハの字）、口をへの字にする
  troubled: (
    <>
      <path
        d="M866 406 l22 -10 M912 396 l22 10"
        stroke={SUMI}
        strokeWidth={7}
        strokeLinecap="round"
      />
      <BlinkingEyes cy={417}>
        <circle cx={879} cy={417} r={4} fill={SUMI} />
        <circle cx={921} cy={417} r={4} fill={SUMI} />
      </BlinkingEyes>
      <path d="M886 438 q14 -10 28 0" {...FACE_LINE} />
    </>
  ),
};

type ShopkeeperProps = { mood: ShopkeeperMood };

/** はちまき姿の店主。カウンターの奥に立つ */
function Shopkeeper({ mood }: ShopkeeperProps) {
  return (
    <g>
      {/* 白い調理服 */}
      <path
        d="M812 548 Q818 452 900 448 Q982 452 988 548 Z"
        fill="var(--color-yatai-kinari)"
        {...OUTLINE}
      />
      <path
        d="M878 452 L900 494 L922 452"
        fill="none"
        stroke={SUMI}
        strokeWidth={5}
        strokeLinejoin="round"
      />
      {/* 顔 */}
      <circle cx={900} cy={396} r={56} fill="#f2c79b" {...OUTLINE} />
      <path d="M848 384 Q852 338 900 336 Q948 338 952 384 Z" fill={SUMI} />
      {/* はちまき */}
      <path
        d="M845 374 Q900 358 955 374 L955 392 Q900 376 845 392 Z"
        fill="var(--color-yatai-kinari)"
        stroke={SUMI}
        strokeWidth={4}
        strokeLinejoin="round"
      />
      <path
        d="M956 382 l22 -14 l4 14 z M956 384 l20 16 l-10 6 z"
        fill="var(--color-yatai-kinari)"
        stroke={SUMI}
        strokeWidth={4}
        strokeLinejoin="round"
      />
      {/* 太い眉と目、口。場面で表情を変える */}
      {SHOPKEEPER_FACES[mood]}
      <circle
        cx={864}
        cy={428}
        r={9}
        fill="var(--color-yatai-lantern)"
        opacity={0.4}
      />
      <circle
        cx={936}
        cy={428}
        r={9}
        fill="var(--color-yatai-lantern)"
        opacity={0.4}
      />
    </g>
  );
}

/**
 * 店主の右腕と、湯切りに使うテボ（麺を茹でるかご）。肩（962, 498）を支点に腕を上げ、テボを振って湯を切る。
 * 下ろしている間はテボがカウンターに隠れるよう、店主とカウンターのあいだに描く。
 * 動きを抑える設定では、腕を下ろしたままにする
 */
function ShopkeeperYuchiri() {
  return (
    <g
      // transform 属性にも transform-origin が効くので、回す角度だけを書く
      transform="rotate(70)"
      style={{ transformOrigin: "962px 498px" }}
      className="motion-safe:animate-shopkeeper-yuchiri"
    >
      {/* 袖と手、柄。袖は輪郭の太い線に服の色の線を重ねる */}
      <path
        d="M962 498 L1002 486"
        stroke={SUMI}
        strokeWidth={30}
        strokeLinecap="round"
      />
      <path
        d="M962 498 L1002 486"
        stroke="var(--color-yatai-kinari)"
        strokeWidth={20}
        strokeLinecap="round"
      />
      <path
        d="M1008 482 L1046 460"
        stroke={SUMI}
        strokeWidth={8}
        strokeLinecap="round"
      />
      <circle cx={1008} cy={484} r={13} fill="#f2c79b" {...OUTLINE} />
      {/* かごと麺 */}
      <path d="M1040 454 h52 l-12 40 q-14 6 -28 0 z" fill={SUMI} {...OUTLINE} />
      <path
        d="M1048 466 h36 M1050 478 h32 M1058 456 l-4 36 M1074 456 l2 36"
        stroke="var(--color-yatai-wood-light)"
        strokeWidth={2}
      />
      <path
        d="M1042 454 q6 -10 13 0 t13 0 t13 0 t11 0"
        fill="none"
        stroke="#f7d774"
        strokeWidth={6}
        strokeLinecap="round"
      />
    </g>
  );
}

/**
 * 屋根の棟を横切る猫（左向きに、足元を原点として描く）。
 * 屋根より奥に描き、屋根の向こうから顔を出して棟を歩く。動きを抑える設定では出さない
 */
function StrayCat() {
  return (
    <g
      transform="translate(1060 168)"
      className="motion-safe:animate-stray-cat motion-reduce:hidden"
    >
      <g className="motion-safe:animate-stray-cat-step">
        {/* しっぽ。輪郭の太い線に毛の色の細い線を重ねる */}
        <path
          d="M28 -18 q22 -4 14 -30"
          fill="none"
          stroke={SUMI}
          strokeWidth={9}
          strokeLinecap="round"
        />
        <path
          d="M28 -18 q22 -4 14 -30"
          fill="none"
          stroke="var(--color-yatai-wood-light)"
          strokeWidth={4}
          strokeLinecap="round"
        />
        <path
          d="M-18 -2 v-8 M-8 -2 v-8 M14 -2 v-8 M24 -2 v-8"
          stroke={SUMI}
          strokeWidth={6}
          strokeLinecap="round"
        />
        <ellipse
          cx={4}
          cy={-16}
          rx={28}
          ry={12}
          fill="var(--color-yatai-wood-light)"
          stroke={SUMI}
          strokeWidth={4}
        />
        <path
          d="M-36 -30 l2 -14 l9 9 z M-21 -35 l7 -9 l2 13 z"
          fill="var(--color-yatai-wood-light)"
          stroke={SUMI}
          strokeWidth={4}
          strokeLinejoin="round"
        />
        <circle
          cx={-26}
          cy={-26}
          r={12}
          fill="var(--color-yatai-wood-light)"
          stroke={SUMI}
          strokeWidth={4}
        />
        <circle cx={-31} cy={-27} r={2} fill={SUMI} />
        <circle cx={-22} cy={-27} r={2} fill={SUMI} />
      </g>
    </g>
  );
}

const NOREN_CHARS = ["ら", "ー", "め", "ん"] as const;

/**
 * プレイ画面の背景。奥から順に夜空、屋根の向こうを横切る猫、屋台の屋根、提灯、のれん、店主、カウンターを描く。
 * 舞台と同じ 16:9 の座標で描き、舞台いっぱいに広げる。
 * 猫は画面を出してからの時間で横切るので、1 プレイに 1 度だけ出すプレイの画面でだけ描く（hasStrayCat）
 */
export function YataiScene({
  shopkeeperMood = "normal",
  isShopkeeperCheering = false,
  isClosingRush = false,
  hasStrayCat = false,
}: YataiStallProps & { hasStrayCat?: boolean }) {
  return (
    <svg
      viewBox="0 0 1280 720"
      aria-hidden="true"
      className="absolute inset-0 size-full"
    >
      <YataiDefs />
      <YataiSky isClosingRush={isClosingRush} />
      {hasStrayCat && <StrayCat />}
      <YataiStall
        shopkeeperMood={shopkeeperMood}
        isShopkeeperCheering={isShopkeeperCheering}
        isClosingRush={isClosingRush}
      />
    </svg>
  );
}

/** 夜空・提灯・屋台の灯りのグラデーション。YataiSky と YataiStall を描く svg に 1 つだけ置く */
export function YataiDefs() {
  return (
    <defs>
      <linearGradient id="night-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="var(--color-yatai-night-deep)" />
        <stop offset="1" stopColor="var(--color-yatai-night)" />
      </linearGradient>
      <radialGradient id="lantern-glow">
        <stop
          offset="0"
          stopColor="var(--color-yatai-amber)"
          stopOpacity={0.45}
        />
        <stop offset="1" stopColor="var(--color-yatai-amber)" stopOpacity={0} />
      </radialGradient>
      <radialGradient id="stall-light" cx="0.5" cy="0.1" r="0.8">
        <stop
          offset="0"
          stopColor="var(--color-yatai-amber)"
          stopOpacity={0.55}
        />
        <stop offset="1" stopColor="var(--color-yatai-amber)" stopOpacity={0} />
      </radialGradient>
      {/* 閉店間際の夜空。地平に近いほど赤みを帯びる */}
      <linearGradient id="closing-rush-sky" x1="0" y1="0" x2="0" y2="1">
        <stop
          offset="0"
          stopColor="var(--color-yatai-lantern)"
          stopOpacity={0.15}
        />
        <stop
          offset="1"
          stopColor="var(--color-yatai-lantern)"
          stopOpacity={0.5}
        />
      </linearGradient>
    </defs>
  );
}

/** 舞台いっぱいの夜空と星、月（1280×720 の座標）。閉店間際は赤みを帯びる */
export function YataiSky({
  isClosingRush = false,
}: {
  isClosingRush?: boolean;
}) {
  return (
    <>
      {/* 夜空と星、月 */}
      <rect width={1280} height={720} fill="url(#night-sky)" />
      <rect
        width={1280}
        height={720}
        fill="url(#closing-rush-sky)"
        opacity={isClosingRush ? 1 : 0}
        className="motion-safe:transition-opacity motion-safe:duration-1000"
      />
      {/* 星はそれぞれ違う長さと始まりで瞬かせ、一斉に点滅させない */}
      {STARS.map(([x, y, r], index) => {
        const { durationS, delayS } = starTwinkleTiming(index);
        return (
          <circle
            key={`${x}-${y}`}
            cx={x}
            cy={y}
            r={r}
            fill="var(--color-yatai-kinari)"
            style={{
              animationDuration: `${durationS}s`,
              animationDelay: `${delayS}s`,
            }}
            className="motion-safe:animate-star-twinkle"
          />
        );
      })}
      <circle cx={1130} cy={56} r={30} fill="var(--color-yatai-amber)" />
      <circle cx={1144} cy={48} r={26} fill="var(--color-yatai-night-deep)" />
    </>
  );
}

type YataiStallProps = {
  shopkeeperMood?: ShopkeeperMood;
  /** 店主が跳び上がって喜んでいる */
  isShopkeeperCheering?: boolean;
  /** 閉店間際は提灯の灯りを強める */
  isClosingRush?: boolean;
};

/** 屋台の壁・屋根・のれん・提灯・店主・カウンター（1280×720 の座標） */
export function YataiStall({
  shopkeeperMood = "normal",
  isShopkeeperCheering = false,
  isClosingRush = false,
}: YataiStallProps) {
  return (
    <>
      {/* 屋台の奥の、灯りのともった壁 */}
      <rect
        x={126}
        y={226}
        width={1028}
        height={320}
        fill="var(--color-yatai-wood-dark)"
      />
      <rect
        x={126}
        y={226}
        width={1028}
        height={320}
        fill="url(#stall-light)"
      />

      {/* 柱と屋根 */}
      <rect
        x={96}
        y={196}
        width={30}
        height={364}
        fill="var(--color-yatai-wood)"
        {...OUTLINE}
      />
      <rect
        x={1154}
        y={196}
        width={30}
        height={364}
        fill="var(--color-yatai-wood)"
        {...OUTLINE}
      />
      <path
        d="M30 200 L110 104 H1170 L1250 200 Z"
        fill="var(--color-yatai-wood-dark)"
        {...OUTLINE}
      />
      {[250, 400, 550, 700, 850, 1000].map((x) => (
        <line
          key={x}
          x1={x}
          y1={108}
          x2={x + (x - 640) * 0.08}
          y2={196}
          stroke={SUMI}
          strokeWidth={3}
        />
      ))}
      <rect
        x={50}
        y={196}
        width={1180}
        height={32}
        rx={4}
        fill="var(--color-yatai-wood)"
        {...OUTLINE}
      />

      {/* のれん。上端を支点にときどき揺らす。布ごとに少し遅らせて、風が端から渡っていくように見せる */}
      {NOREN_CHARS.map((char, index) => {
        const x = 330 + index * 157;
        return (
          <g
            key={char}
            style={{
              transformOrigin: `${x + 75}px 228px`,
              animationDelay: `${index * 0.15}s`,
            }}
            className="motion-safe:animate-noren-flutter"
          >
            <path
              d={`M${x} 228 h150 v104 q-75 10 -150 0 z`}
              fill="var(--color-yatai-lantern-dark)"
              {...OUTLINE}
            />
            <text
              x={x + 75}
              y={304}
              textAnchor="middle"
              fontSize={64}
              fill="var(--color-yatai-kinari)"
              className="font-display"
            >
              {char}
            </text>
          </g>
        );
      })}

      <Lantern cx={196} label={["中", "華"]} isClosingRush={isClosingRush} />
      <Lantern cx={1084} label={["そ", "ば"]} isClosingRush={isClosingRush} />

      {/* 結果画面で上の称号が出たら、腕ごと跳び上がって喜ぶ */}
      <g
        className={
          isShopkeeperCheering
            ? "motion-safe:animate-shopkeeper-cheer"
            : undefined
        }
      >
        <Shopkeeper mood={shopkeeperMood} />
        <ShopkeeperYuchiri />
      </g>

      {/* 木のカウンター。脇には夜空を見せる（ページの背景と同じ色で塗ると、舞台の外と見分けられない）。
          券売機の画面で縮小して置いても舞台の下端まで届くよう、下に長く伸ばしておく */}
      <rect
        x={40}
        y={576}
        width={1200}
        height={224}
        fill="var(--color-yatai-wood)"
        {...OUTLINE}
      />
      {[160, 300, 440, 580, 720, 860, 1000, 1140].map((x) => (
        <line
          key={x}
          x1={x}
          y1={580}
          x2={x}
          y2={800}
          stroke="var(--color-yatai-wood-dark)"
          strokeWidth={4}
        />
      ))}
      <rect
        x={18}
        y={540}
        width={1244}
        height={38}
        rx={6}
        fill="var(--color-yatai-wood-light)"
        {...OUTLINE}
      />
    </>
  );
}
