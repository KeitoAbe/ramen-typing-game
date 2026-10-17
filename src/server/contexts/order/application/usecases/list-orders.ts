import type { OrderRepository } from "@/server/contexts/order/domain/repositories/order-repository";
import type { Order } from "@/types/order";

export function listOrders(repository: OrderRepository): Promise<Order[]> {
  return repository.findAll();
}
