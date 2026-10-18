import { expect, type Locator, test } from "@e2e/fixtures";

// 押せる要素にマウスを載せるとカーソルが指の形になり、押せない状態や押せない表示ではならないことを確かめる。
// 規則はサイト全体に効かせている（src/app/globals.css の @layer base、docs/design.md の「カーソル」）

async function expectCursor(locator: Locator, cursor: string) {
  await expect(locator).toHaveCSS("cursor", cursor);
}

test("券売機・トッピング・プレイ中・結果画面で、押せるものだけ指の形になる", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");

  // 券売機: 食券のボタンと効果音の札は指の形
  const nami = page.getByRole("button", { name: /^並/ });
  await expectCursor(nami, "pointer");
  await expectCursor(page.getByRole("button", { name: /^効果音/ }), "pointer");

  // 食券を買ったあとの券売機のボタンは押せないので、指の形にしない
  await nami.click();
  await expect(nami).toBeDisabled();
  await expectCursor(nami, "default");

  // トッピング: 券（チェックボックスとその札）と「いただきます」は指の形
  const firstTopping = page.getByRole("checkbox").first();
  await expectCursor(firstTopping, "pointer");
  await expectCursor(firstTopping.locator(".."), "pointer");
  await expectCursor(
    page.getByRole("button", { name: "いただきます" }),
    "pointer",
  );
  await page.getByRole("button", { name: "いただきます" }).click();
  await page.keyboard.press("Enter");

  // プレイ中: 注文の札（押せない表示）は指の形にしない
  const remaining = page.getByTestId("remaining-romaji");
  await expect(remaining).not.toBeEmpty();
  await expectCursor(remaining, "auto");

  // 結果画面: 「もう一杯」と「X で共有」は指の形、伝票は指の形にしない
  await page.clock.runFor(61_000);
  await expect(page.getByRole("heading", { name: "御会計" })).toBeVisible();
  await expectCursor(page.getByRole("button", { name: "もう一杯" }), "pointer");
  await expectCursor(
    page.getByRole("button", { name: /^X で共有/ }),
    "pointer",
  );
  await expectCursor(page.getByRole("heading", { name: "御会計" }), "auto");
});

test("トップページのフッターのリンクは指の形になる", async ({ page }) => {
  await page.goto("/");

  const footer = page.getByRole("navigation", { name: "サイトの情報" });
  for (const name of ["プライバシーポリシー", "運営者情報", "お問い合わせ"]) {
    await expectCursor(footer.getByRole("link", { name }), "pointer");
  }
});
