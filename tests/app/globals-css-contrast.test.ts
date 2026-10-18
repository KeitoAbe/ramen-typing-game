import { readFileSync } from "node:fs";
import { join } from "node:path";

// docs/design.md の「色」の表に載せた、文字色と背景色の組み合わせのコントラスト比を確かめる。
// 色を変えたときに、本文が読みにくくならないようにする

const css = readFileSync(join(__dirname, "../../src/app/globals.css"), "utf8");

/** globals.css の @theme にある --color-yatai-{name} の値 */
function color(name: string): string {
  const match = css.match(
    new RegExp(`--color-yatai-${name}:\\s*(#[0-9a-f]{6});`, "i"),
  );
  if (!match) throw new Error(`--color-yatai-${name} が見つからない`);
  return match[1];
}

/** WCAG 2.x の相対輝度 */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((start) => {
    const channel = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(foreground: string, background: string): number {
  const [light, dark] = [luminance(foreground), luminance(background)].sort(
    (a, b) => b - a,
  );
  return (light + 0.05) / (dark + 0.05);
}

/** 本文やラベルに使う組み合わせ。WCAG AA の 4.5:1 以上 */
const BODY_TEXT_PAIRS: readonly [text: string, background: string][] = [
  ["kinari", "night-deep"],
  ["kinari", "night"],
  // 木の板
  ["kinari", "wood-dark"],
  ["amber", "wood-dark"],
  ["amber", "night-deep"],
  // 紙
  ["sumi", "kinari"],
  ["lantern-dark", "kinari"],
  ["ai", "kinari"],
  // 琥珀色の札
  ["sumi", "amber"],
];

/** 大きな文字（看板・いちばん押してほしいボタン）だけに使う組み合わせ。大きな文字の AA の 3:1 以上 */
const LARGE_TEXT_PAIRS: readonly [text: string, background: string][] = [
  ["kinari", "lantern"],
];

describe("globals.css の配色", () => {
  test.each(BODY_TEXT_PAIRS)("%s の文字は %s の上で 4.5:1 以上", (text, bg) => {
    expect(contrastRatio(color(text), color(bg))).toBeGreaterThanOrEqual(4.5);
  });

  test.each(
    LARGE_TEXT_PAIRS,
  )("%s の大きな文字は %s の上で 3:1 以上", (text, bg) => {
    expect(contrastRatio(color(text), color(bg))).toBeGreaterThanOrEqual(3);
  });

  test("コントラスト比は WCAG の式どおりに計算する", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21);
    expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
  });
});
