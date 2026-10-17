import { RamenGame } from "@/client/components/ramen-game/ramen-game";
import { loadOrders } from "@/server/contexts/order/presentation/loaders/load-orders";

export default async function Home() {
  const orders = await loadOrders();
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">ラーメン屋台</h1>
      <RamenGame orders={orders} />
    </main>
  );
}
