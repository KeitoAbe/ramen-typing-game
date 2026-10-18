import { ImageResponse } from "next/og";
import { OG_IMAGE_ALT, SITE_NAME } from "@/app/site-metadata";
import { loadOgImageFonts } from "@/server/contexts/shared/presentation/loaders/load-og-image-fonts";

export const alt = OG_IMAGE_ALT;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// globals.css の屋台の配色と同じ色。ImageResponse は CSS 変数を読めないので値で書く
const NIGHT = "#1b2340";
const NIGHT_DEEP = "#11162b";
const LANTERN = "#d9412b";
const LANTERN_DARK = "#a92f1f";
const AMBER = "#f5b942";
const WOOD = "#8a5a33";
const WOOD_DARK = "#5e3b20";
const WOOD_LIGHT = "#c08a55";
const KINARI = "#f3e6c8";
const SUMI = "#2a1f1a";

const NOREN_CHARS = ["ら", "ー", "め", "ん"] as const;
const TAGLINE = "注文をローマ字で打って、ラーメンを平らげよう";
const ROMAJI_SAMPLE = "shouyu";

// 夜空の星の位置（x, y, 直径）。屋根より上に散らす
const STARS: readonly (readonly [number, number, number])[] = [
  [60, 28, 4],
  [170, 64, 6],
  [300, 20, 4],
  [420, 52, 4],
  [560, 24, 6],
  [690, 60, 4],
  [820, 30, 4],
  [930, 70, 6],
  [1010, 22, 4],
];

const FONT_FAMILY_DISPLAY = "Dela Gothic One";
const FONT_FAMILY_BODY = "Zen Maru Gothic";

type LanternProps = { left: number; label: readonly [string, string] };

/** 屋根から下がる赤い提灯 */
function Lantern({ left, label }: LanternProps) {
  return (
    <div
      style={{
        position: "absolute",
        left,
        top: 150,
        width: 112,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div style={{ width: 5, height: 28, background: SUMI }} />
      <div
        style={{
          width: 104,
          height: 128,
          borderRadius: "50%",
          background: LANTERN,
          border: `6px solid ${SUMI}`,
          boxShadow: `0 0 60px ${AMBER}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT_FAMILY_DISPLAY,
          fontSize: 34,
          lineHeight: 1.1,
          color: SUMI,
        }}
      >
        <span>{label[0]}</span>
        <span>{label[1]}</span>
      </div>
    </div>
  );
}

/** 湯気の立つラーメンの丼 */
function RamenBowl() {
  return (
    <svg width={220} height={150} viewBox="0 0 220 150" aria-hidden="true">
      {/* 湯気 */}
      <path
        d="M70 40 q-12 -16 0 -32 M110 36 q-12 -16 0 -32 M150 40 q-12 -16 0 -32"
        fill="none"
        stroke={KINARI}
        strokeWidth={6}
        strokeLinecap="round"
        opacity={0.8}
      />
      {/* 丼の中のスープとチャーシュー・なると */}
      <ellipse
        cx={110}
        cy={62}
        rx={100}
        ry={20}
        fill={AMBER}
        stroke={SUMI}
        strokeWidth={6}
      />
      <circle
        cx={80}
        cy={60}
        r={12}
        fill={WOOD_LIGHT}
        stroke={SUMI}
        strokeWidth={4}
      />
      <circle
        cx={140}
        cy={60}
        r={10}
        fill={KINARI}
        stroke={SUMI}
        strokeWidth={4}
      />
      <circle cx={140} cy={60} r={4} fill={LANTERN} />
      {/* 丼 */}
      <path
        d="M10 62 Q16 136 110 140 Q204 136 210 62 Q110 90 10 62 Z"
        fill={LANTERN}
        stroke={SUMI}
        strokeWidth={6}
        strokeLinejoin="round"
      />
      <path
        d="M40 96 h140"
        stroke={KINARI}
        strokeWidth={6}
        strokeDasharray="14 10"
      />
    </svg>
  );
}

/** リンクを共有したときに出す、夜の屋台に看板を掛けた画像 */
export default async function Image() {
  const fonts = await loadOgImageFonts({
    displayText: `${SITE_NAME}${NOREN_CHARS.join("")}中華そば`,
    bodyText: `${TAGLINE}${ROMAJI_SAMPLE}`,
  });

  return new ImageResponse(
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        background: `linear-gradient(180deg, ${NIGHT_DEEP}, ${NIGHT})`,
      }}
    >
      {STARS.map(([x, y, diameter]) => (
        <div
          key={`${x}-${y}`}
          style={{
            position: "absolute",
            left: x,
            top: y,
            width: diameter,
            height: diameter,
            borderRadius: "50%",
            background: KINARI,
          }}
        />
      ))}
      {/* 三日月 */}
      <div
        style={{
          position: "absolute",
          left: 1080,
          top: 24,
          width: 60,
          height: 60,
          borderRadius: "50%",
          background: AMBER,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 1094,
          top: 16,
          width: 54,
          height: 54,
          borderRadius: "50%",
          background: NIGHT_DEEP,
        }}
      />

      {/* 灯りのともった屋台の奥の壁 */}
      <div
        style={{
          position: "absolute",
          left: 90,
          top: 150,
          width: 1020,
          height: 360,
          background: `radial-gradient(circle at 50% 10%, rgba(245, 185, 66, 0.5), ${WOOD_DARK} 70%)`,
        }}
      />
      {/* 柱 */}
      <div
        style={{
          position: "absolute",
          left: 64,
          top: 140,
          width: 30,
          height: 380,
          background: WOOD,
          border: `6px solid ${SUMI}`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 1106,
          top: 140,
          width: 30,
          height: 380,
          background: WOOD,
          border: `6px solid ${SUMI}`,
        }}
      />
      {/* 屋根 */}
      <div
        style={{
          position: "absolute",
          left: 20,
          top: 96,
          width: 1160,
          height: 56,
          borderRadius: 8,
          background: WOOD_DARK,
          border: `6px solid ${SUMI}`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 36,
          top: 140,
          width: 1128,
          height: 28,
          borderRadius: 4,
          background: WOOD,
          border: `6px solid ${SUMI}`,
        }}
      />

      {/* のれん */}
      <div
        style={{
          position: "absolute",
          left: 290,
          top: 162,
          display: "flex",
        }}
      >
        {NOREN_CHARS.map((char) => (
          <div
            key={char}
            style={{
              width: 150,
              height: 96,
              marginRight: 6,
              background: LANTERN_DARK,
              border: `6px solid ${SUMI}`,
              borderRadius: "0 0 12px 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: FONT_FAMILY_DISPLAY,
              fontSize: 58,
              color: KINARI,
            }}
          >
            {char}
          </div>
        ))}
      </div>

      <Lantern left={130} label={["中", "華"]} />
      <Lantern left={958} label={["そ", "ば"]} />

      {/* 看板と、遊び方のひとこと */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 284,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            padding: "14px 44px",
            borderRadius: 10,
            background: LANTERN,
            border: `7px solid ${SUMI}`,
            boxShadow: "0 0 48px rgba(245, 185, 66, 0.6)",
            fontFamily: FONT_FAMILY_DISPLAY,
            fontSize: 76,
            letterSpacing: 6,
            color: KINARI,
          }}
        >
          {SITE_NAME}
        </div>
        <div
          style={{
            marginTop: 22,
            fontFamily: FONT_FAMILY_BODY,
            fontWeight: 700,
            fontSize: 36,
            color: KINARI,
            textShadow: `0 3px 0 ${SUMI}`,
          }}
        >
          {TAGLINE}
        </div>
      </div>

      {/* 木のカウンターと、出てきた丼 */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 534,
          width: 1200,
          height: 96,
          background: WOOD,
          borderTop: `6px solid ${SUMI}`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 8,
          top: 506,
          width: 1184,
          height: 36,
          borderRadius: 6,
          background: WOOD_LIGHT,
          border: `6px solid ${SUMI}`,
        }}
      />
      <div
        style={{ position: "absolute", left: 120, top: 398, display: "flex" }}
      >
        <RamenBowl />
      </div>
      {/* 打つローマ字の札 */}
      <div
        style={{
          position: "absolute",
          right: 120,
          top: 440,
          padding: "8px 28px",
          borderRadius: 10,
          background: KINARI,
          border: `6px solid ${SUMI}`,
          fontFamily: FONT_FAMILY_BODY,
          fontWeight: 700,
          fontSize: 40,
          letterSpacing: 4,
          color: SUMI,
        }}
      >
        {ROMAJI_SAMPLE}
      </div>
    </div>,
    { ...size, fonts },
  );
}
