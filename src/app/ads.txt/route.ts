import { buildAdsTxt, parseAdsensePublisherId } from "@/client/lib/adsense";

// static export では、Route Handler を静的だと明示しないとビルド時にファイルが出力されない
export const dynamic = "force-static";

// NEXT_PUBLIC_ の変数はビルド時に値が埋め込まれるので、ビルド時に中身が決まる
export function GET(): Response {
  const publisherId = parseAdsensePublisherId(
    process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID,
  );
  if (!publisherId) {
    // static export は 404 の応答もファイルとして書き出してしまう（配信すると 200 で返る）。
    // 404 以外の 4xx を返すと書き出さないので、out/ に ads.txt が無いまま、配信先では 404 になる
    return new Response(null, { status: 410 });
  }
  return new Response(buildAdsTxt(publisherId), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
