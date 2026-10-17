import { SOGGY_START_RATIO, soggyLimitMs } from "@/client/lib/ramen-bowl";
import { COURSES, ordersForCourse } from "@/client/lib/ramen-course";
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

/** 普通の腕前の打鍵の速さ（ramen-course の食券代の釣り合いと同じ前提） */
const NORMAL_KEYS_PER_SECOND = 2;

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

  it.each(
    COURSES.map((course) => [course.name, course]),
  )("%s のコースに出せる注文が 30 件以上ある", (_name, course) => {
    expect(
      ordersForCourse(STATIC_ORDERS, course).length,
    ).toBeGreaterThanOrEqual(30);
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

  it.each(
    COURSES.map((course) => [course.name, course]),
  )("%s のコースの注文は、毎秒 2 キーで打てばのびかける前に完食できる", (_name, course) => {
    for (const order of ordersForCourse(STATIC_ORDERS, course)) {
      const keyCount = remainingRomaji(createTypingState(order.reading)).length;
      const typingMs = (keyCount / NORMAL_KEYS_PER_SECOND) * 1000;
      expect(typingMs).toBeLessThanOrEqual(
        soggyLimitMs(order) * SOGGY_START_RATIO,
      );
    }
  });
});
