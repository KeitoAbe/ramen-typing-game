import { GameGuide } from "@/client/components/game-guide/game-guide";
import { RamenGame } from "@/client/components/ramen-game/ramen-game";
import { SiteFooter } from "@/client/components/site-footer/site-footer";
import { loadOrders } from "@/server/contexts/order/presentation/loaders/load-orders";

export default async function Home() {
  const orders = await loadOrders();
  // 開いたときは舞台だけが画面に収まり、下にスクロールすると紹介（ページの見出しを含む）が読める
  return (
    <>
      <main className="flex w-full flex-1 flex-col">
        <div className="flex min-h-dvh w-full items-center justify-center overflow-hidden">
          <RamenGame orders={orders} />
        </div>
        <GameGuide />
      </main>
      <SiteFooter />
    </>
  );
}
