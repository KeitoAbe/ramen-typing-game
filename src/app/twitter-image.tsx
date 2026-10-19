// X の大きいカード（summary_large_image）にも OGP と同じ画像を使う
export {
  alt,
  contentType,
  default,
  size,
} from "@/app/opengraph-image";

// ルートの設定は再エクスポートでは読まれないので、ここにも書く。
// static export では、静的だと明示しないとビルド時にファイルが出力されない
export const dynamic = "force-static";
