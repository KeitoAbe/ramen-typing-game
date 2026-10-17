import type { Order } from "@/types/order";

export interface OrderRepository {
  findAll(): Promise<Order[]>;
}
