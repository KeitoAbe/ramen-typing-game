import type { Metadata } from "next";
import { SITE_NAME } from "@/app/site-metadata";
import { buildGameJsonLd, getSiteUrl, serializeJsonLd } from "@/app/site-url";
import { GuideAd } from "@/client/components/adsense/guide-ad";
import { StageBottomAd } from "@/client/components/adsense/stage-bottom-ad";
import { StageSideAd } from "@/client/components/adsense/stage-side-ad";
import { GameGuide } from "@/client/components/game-guide/game-guide";
import { RamenGame } from "@/client/components/ramen-game/ramen-game";
import { SiteFooter } from "@/client/components/site-footer/site-footer";
import { SiteHeader } from "@/client/components/site-header/site-header";
import { loadOrders } from "@/server/contexts/order/presentation/loaders/load-orders";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function Home() {
  const orders = await loadOrders();
  // 舞台は全画面にせず、決まった大きさ（幅 960px まで）でページの中央に置く。
  // 開いたときにヘッダー・舞台・舞台の下の広告枠が収まり、その下に紹介（ページの見出しを含む）が続く。
  // 広告は舞台のすぐ下・広い画面では舞台の右・紹介の後ろに置き、誤クリックを誘わないよう舞台から離す。
  // 右の枠があるときは、舞台と右の枠をまとめて中央に置く
  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD は script の中身として埋め込むしかなく、serializeJsonLd で `<` を逃がしている
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(buildGameJsonLd(getSiteUrl())),
        }}
      />
      <SiteHeader siteName={SITE_NAME} />
      <main className="flex w-full flex-1 flex-col">
        <div className="flex w-full justify-center gap-8 pt-4">
          <div className="flex w-full min-w-0 max-w-[960px] flex-col items-center">
            <RamenGame orders={orders} />
            <StageBottomAd />
          </div>
          <StageSideAd />
        </div>
        <GameGuide />
        <GuideAd />
      </main>
      <SiteFooter />
    </>
  );
}
