import { expect, type Locator, type Page, test } from "@e2e/fixtures";

// プレイ中の手応えの動き（docs/design.md の「動き」）を確かめる

async function startPlaying(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /^並/ }).click();
  await page.getByRole("button", { name: "いただきます" }).click();
  await expect(page.getByTestId("remaining-romaji")).not.toBeEmpty();
}

/** 要素に付いている CSS アニメーションの名前 */
function animationNames(locator: Locator) {
  return locator.evaluate((element) =>
    element
      .getAnimations()
      .map((animation) => (animation as CSSAnimation).animationName),
  );
}

/** ローマ字の行（打った文字と、これから打つ文字を並べた行） */
function romajiLine(page: Page) {
  return page.getByTestId("remaining-romaji").locator("..");
}

test("正しく打つと打った文字が弾み、ミスするとローマ字が横に震え、平らげると値段が浮かび上がる", async ({
  page,
}) => {
  await startPlaying(page);
  const romaji =
    (await page.getByTestId("remaining-romaji").textContent()) ?? "";

  await page.keyboard.press(romaji.charAt(0));
  const lastTyped = page.getByTestId("last-typed-romaji");
  await expect(lastTyped).toHaveText(romaji.charAt(0));
  expect(await animationNames(lastTyped)).toContain("key-bounce");

  await page.keyboard.press("1");
  await expect
    .poll(() => animationNames(romajiLine(page)))
    .toContain("romaji-shake");

  await page.keyboard.type(romaji.slice(1));
  const pricePop = page.getByTestId("price-pop");
  await expect(pricePop).toHaveText(/^\+[\d,]+ 円/);
  expect(await animationNames(pricePop)).toContain("price-pop");
});

test("動きを抑える設定では、打鍵・ミス・値段を動かさず、透明度の変化だけで伝える", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await startPlaying(page);
  const romaji =
    (await page.getByTestId("remaining-romaji").textContent()) ?? "";

  await page.keyboard.press(romaji.charAt(0));
  const lastTyped = page.getByTestId("last-typed-romaji");
  await expect(lastTyped).toHaveText(romaji.charAt(0));
  expect(await animationNames(lastTyped)).toEqual([]);

  await page.keyboard.press("1");
  await expect
    .poll(() => animationNames(romajiLine(page)))
    .toEqual(["soft-flash"]);

  await page.keyboard.type(romaji.slice(1));
  const pricePop = page.getByTestId("price-pop");
  await expect(pricePop).toHaveText(/^\+[\d,]+ 円/);
  expect(await animationNames(pricePop)).toEqual(["price-fade"]);
});
