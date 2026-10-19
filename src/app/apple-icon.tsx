import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// static export では、静的だと明示しないとビルド時にファイルが出力されない
export const dynamic = "force-static";
export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

// タブのアイコン（icon.svg）と同じ絵柄を使う。リクエストに依存しないので、モジュールの読み込み時に 1 回だけ読む
const iconSvg = await readFile(join(process.cwd(), "src/app/icon.svg"), "utf8");
// iOS が角丸をかけるので、背景の角丸は外して四角いまま塗る
const squareIconSrc = `data:image/svg+xml;base64,${Buffer.from(iconSvg.replace('rx="14" ', "")).toString("base64")}`;

/** iOS のホーム画面に追加したときのアイコン */
export default function AppleIcon() {
  return new ImageResponse(
    // biome-ignore lint/performance/noImgElement: ImageResponse の中では next/image を使えない
    <img src={squareIconSrc} width={size.width} height={size.height} alt="" />,
    { ...size },
  );
}
