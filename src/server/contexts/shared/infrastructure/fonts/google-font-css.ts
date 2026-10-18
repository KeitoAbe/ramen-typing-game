/**
 * Google Fonts の CSS API の URL を組み立てる。
 * text を渡すと、その文字だけを含む小さなフォントが返る
 */
export function googleFontCssUrl(
  family: string,
  weight: number,
  text: string,
): string {
  const params = new URLSearchParams({
    family: `${family}:wght@${weight}`,
    text,
  });
  return `https://fonts.googleapis.com/css2?${params}`;
}

/**
 * CSS API の応答から、フォント本体の URL を取り出す。
 * OGP 画像の描画（next/og）は woff2 を読めないので、truetype / opentype だけを拾う
 */
export function extractFontFileUrl(css: string): string | null {
  const match = css.match(
    /src:\s*url\(([^)]+)\)\s*format\(['"](?:truetype|opentype)['"]\)/,
  );
  return match ? match[1] : null;
}
