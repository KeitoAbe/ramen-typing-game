import { SITE_NAME } from "@/app/site-metadata";
import { GuideAd } from "@/client/components/adsense/guide-ad";
import { GameGuide } from "@/client/components/game-guide/game-guide";
import { RamenGame } from "@/client/components/ramen-game/ramen-game";
import { SiteFooter } from "@/client/components/site-footer/site-footer";
import { SiteHeader } from "@/client/components/site-header/site-header";
import { loadOrders } from "@/server/contexts/order/presentation/loaders/load-orders";

export default async function Home() {
  const orders = await loadOrders();
  // 舞台は全画面にせず、決まった大きさ（幅 960px まで）でページの中央に置く。
  // 開いたときにヘッダーと舞台が収まり、その下に紹介（ページの見出しを含む）の始まりが見える。
  // 広告は紹介の後ろに置き、誤クリックを誘わないよう舞台から離す
  return (
    <>
      <SiteHeader siteName={SITE_NAME} />
      <main className="flex w-full flex-1 flex-col">
        <div className="flex w-full justify-center pt-4">
          <RamenGame orders={orders} />
        </div>
        <GameGuide />
        <GuideAd />
      </main>
      <SiteFooter />
    </>
  );
}
