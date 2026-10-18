import "server-only";

import {
  extractFontFileUrl,
  googleFontCssUrl,
} from "@/server/contexts/shared/infrastructure/fonts/google-font-css";

/**
 * OGP 画像に描く文字だけを含むフォントを Google Fonts から読み込む。
 * 画面と同じ書体を使うため、素材ファイルをリポジトリに置かずに取り寄せる
 */
export async function loadGoogleFont(
  family: string,
  weight: number,
  text: string,
): Promise<ArrayBuffer> {
  const cssResponse = await fetch(googleFontCssUrl(family, weight, text));
  if (!cssResponse.ok) {
    throw new Error(
      `${family} の CSS を取得できませんでした（${cssResponse.status}）`,
    );
  }
  const fontUrl = extractFontFileUrl(await cssResponse.text());
  if (!fontUrl) {
    throw new Error(`${family} の truetype のフォントが見つかりませんでした`);
  }
  const fontResponse = await fetch(fontUrl);
  if (!fontResponse.ok) {
    throw new Error(
      `${family} のフォントを取得できませんでした（${fontResponse.status}）`,
    );
  }
  return fontResponse.arrayBuffer();
}
