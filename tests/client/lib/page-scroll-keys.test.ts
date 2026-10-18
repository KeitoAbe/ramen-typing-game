import { isPageScrollKey } from "@/client/lib/page-scroll-keys";

describe("isPageScrollKey", () => {
  it.each([
    " ",
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "PageUp",
    "PageDown",
    "Home",
    "End",
  ])("%j はページをスクロールさせるキー", (key) => {
    expect(isPageScrollKey(key)).toBe(true);
  });

  it.each([
    "a",
    "-",
    "Enter",
    "Escape",
    "Shift",
    "Tab",
  ])("%j はスクロールさせるキーではない", (key) => {
    expect(isPageScrollKey(key)).toBe(false);
  });
});
