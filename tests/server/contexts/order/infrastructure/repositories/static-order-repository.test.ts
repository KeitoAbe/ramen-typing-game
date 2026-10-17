import {
  createTypingState,
  inputKey,
  isComplete,
  remainingRomaji,
} from "@/client/lib/romaji/typing";
import {
  STATIC_ORDERS,
  StaticOrderRepository,
} from "@/server/contexts/order/infrastructure/repositories/static-order-repository";

/** 表示どおりに打てば打ち終えられるか（つづりの分からない文字がないか） */
function canTypeAsShown(reading: string): boolean {
  let state = createTypingState(reading);
  for (const key of remainingRomaji(state)) {
    const result = inputKey(state, key);
    if (!result.accepted) return false;
    state = result.state;
  }
  return isComplete(state);
}

describe("StaticOrderRepository", () => {
  it("注文を 15 件以上返す", async () => {
    const orders = await new StaticOrderRepository().findAll();
    expect(orders.length).toBeGreaterThanOrEqual(15);
  });

  it("id が重複しない", () => {
    const ids = STATIC_ORDERS.map((order) => order.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(
    STATIC_ORDERS.map((order) => [order.text, order.reading]),
  )("「%s」のよみ (%s) は表示どおりに打ち終えられる", (_text, reading) => {
    expect(canTypeAsShown(reading)).toBe(true);
  });
});
