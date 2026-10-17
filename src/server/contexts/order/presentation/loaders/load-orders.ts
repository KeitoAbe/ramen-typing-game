import "server-only";

import { listOrders } from "@/server/contexts/order/application/usecases/list-orders";
import { StaticOrderRepository } from "@/server/contexts/order/infrastructure/repositories/static-order-repository";
import type { Order } from "@/types/order";

export function loadOrders(): Promise<Order[]> {
  return listOrders(new StaticOrderRepository());
}
