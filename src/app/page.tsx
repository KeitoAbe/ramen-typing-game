import type { Metadata, ResolvingMetadata } from "next";
import {
  pageMetadata,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
} from "@/app/site-metadata";
import { buildGameJsonLd, getSiteUrl, serializeJsonLd } from "@/app/site-url";
import { AdsenseScript } from "@/client/components/adsense/adsense-script";
import { GuideAd } from "@/client/components/adsense/guide-ad";
import { GameGuide } from "@/client/components/game-guide/game-guide";
import { RamenGame } from "@/client/components/ramen-game/ramen-game";
import { SiteFooter } from "@/client/components/site-footer/site-footer";
import { SiteHeader } from "@/client/components/site-header/site-header";
import { loadOrders } from "@/server/contexts/order/presentation/loaders/load-orders";

export function generateMetadata(
  _props: unknown,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  return pageMetadata(
    { title: SITE_TITLE, description: SITE_DESCRIPTION, path: "/" },
    parent,
  );
}

export default async function Home() {
  const orders = await loadOrders();
  // 舞台は全画面にせず、決まった大きさ（幅 960px まで）でページの中央に置く。
  // 開いたときにヘッダーと舞台が収まり、その下に紹介（ページの見出しを含む）が続く。
  // 広告は、読み物のある紹介の後ろだけに置く。操作が目的の舞台の周囲には置かない
  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD は script の中身として埋め込むしかなく、serializeJsonLd で `<` を逃がしている
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(buildGameJsonLd(getSiteUrl())),
        }}
      />
      {/* 広告枠があるトップページだけでアドセンスのスクリプトを読み込む。
          他ページ（/about・/contact・/privacy）は広告枠を持たないため読み込まない */}
      <AdsenseScript />
      <SiteHeader siteName={SITE_NAME} align="stage" />
      <main className="flex w-full flex-1 flex-col">
        <div className="flex w-full justify-center pt-4">
          <div className="flex w-full min-w-0 max-w-[960px] flex-col items-center">
            <RamenGame orders={orders} />
          </div>
        </div>
        <GameGuide />
        <GuideAd />
      </main>
      <SiteFooter />
    </>
  );
}
