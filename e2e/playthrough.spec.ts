import { expect, type Page, test } from "@playwright/test";

// 券売機で食券を買い、注文を打って、時間切れで結果画面が出るまでを通しで遊ぶ。
// 時間は page.clock で早送りし、制限時間（並は 60 秒）を実際には待たない

/** 読み込みからプレイの終わりまでに出た、コンソールのエラーとページの例外を集める */
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

/** 結果画面の伝票で、見出し（dt）に対応する値（dd）を返す */
function receiptValue(page: Page, label: string) {
  return page
    .locator("dt", { hasText: new RegExp(`^${label}$`) })
    .locator("xpath=following-sibling::dd[1]");
}

test("券売機から並を遊び、結果画面を見て券売機に戻れる", async ({ page }) => {
  const errors = collectErrors(page);
  await page.clock.install();
  await page.goto("/");

  // 券売機で並の食券を買い、トッピングなしで始める
  await page.getByRole("button", { name: /^並/ }).click();
  await page.getByRole("button", { name: "いただきます" }).click();

  const remaining = page.getByTestId("remaining-romaji");
  const servedCount = page.getByText("平らげた杯数").locator("..");
  await expect(remaining).not.toBeEmpty();
  await expect(servedCount).toHaveText(/平らげた杯数\s*0\s*杯/);

  // 打ち間違えたら、注文は進まない
  const firstRomaji = (await remaining.textContent()) ?? "";
  await page.keyboard.press("1");
  await expect(remaining).toHaveText(firstRomaji);

  // 画面に出ているローマ字を打ち切ると、平らげた杯数が増えて次の注文に進む
  await page.keyboard.type(firstRomaji);
  await expect(servedCount).toHaveText(/平らげた杯数\s*1\s*杯/);
  await expect(remaining).not.toBeEmpty();

  // 制限時間（60 秒）を過ぎると閉店して、結果画面が出る
  await page.clock.runFor(61_000);
  await expect(page.getByRole("heading", { name: "御会計" })).toBeVisible();
  await expect(receiptValue(page, "平らげた杯数")).toHaveText("1 杯");
  await expect(receiptValue(page, "ミスタイプ数")).toHaveText("1 回");
  await expect(receiptValue(page, "お会計")).toHaveText(/^[\d,]+ 円$/);

  // 結果画面から券売機に戻れる
  await page.getByRole("button", { name: "もう一杯" }).click();
  await expect(page.getByRole("button", { name: /^並/ })).toBeVisible();

  expect(errors).toEqual([]);
});
