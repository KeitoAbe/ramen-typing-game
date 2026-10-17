import { RamenGame } from "@/client/components/ramen-game/ramen-game";
import { loadOrders } from "@/server/contexts/order/presentation/loaders/load-orders";

export default async function Home() {
  const orders = await loadOrders();
  // タイトルは舞台の中の看板やのれんで見せるので、ページの見出しは置かない
  return (
    <main className="flex min-h-dvh w-full flex-1 items-center justify-center overflow-hidden">
      <RamenGame orders={orders} />
    </main>
  );
}
