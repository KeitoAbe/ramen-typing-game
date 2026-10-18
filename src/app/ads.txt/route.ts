import { buildAdsTxt, parseAdsensePublisherId } from "@/client/lib/adsense";

// NEXT_PUBLIC_ の変数はビルド時に値が埋め込まれるので、ビルド時に中身が決まる
export function GET(): Response {
  const publisherId = parseAdsensePublisherId(
    process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID,
  );
  if (!publisherId) {
    return new Response("Not Found", { status: 404 });
  }
  return new Response(buildAdsTxt(publisherId), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
