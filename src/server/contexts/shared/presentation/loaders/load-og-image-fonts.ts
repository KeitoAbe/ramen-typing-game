import "server-only";

import { loadGoogleFont } from "@/server/contexts/shared/infrastructure/fonts/load-google-font";

/** ImageResponse の fonts に渡す形 */
type OgImageFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 700;
  style: "normal";
};

/**
 * OGP 画像に使う、画面と同じ書体（看板の Dela Gothic One・本文の Zen Kaku Gothic New）を読み込む。
 * 描く文字だけを取り寄せるので、それぞれの書体で描く文字を渡す。
 * static export で OGP 画像はビルド時に 1 回だけ作られるので、開くたびに Google Fonts へ取りに行くことはない
 */
export async function loadOgImageFonts({
  displayText,
  bodyText,
}: {
  displayText: string;
  bodyText: string;
}): Promise<OgImageFont[]> {
  const [display, body] = await Promise.all([
    loadGoogleFont("Dela Gothic One", 400, displayText),
    loadGoogleFont("Zen Kaku Gothic New", 700, bodyText),
  ]);
  return [
    { name: "Dela Gothic One", data: display, weight: 400, style: "normal" },
    { name: "Zen Kaku Gothic New", data: body, weight: 700, style: "normal" },
  ];
}
