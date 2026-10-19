import { expect, type Page, test } from "@e2e/fixtures";

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

  // 「いただきます」のあとは、スペースか Enter を押すまで始まらない。丼も時計もまだ出ない
  const remaining = page.getByTestId("remaining-romaji");
  const clock = page.getByText("残り時間", { exact: true }).locator("..");
  await expect(page.getByText("スペース か Enter で始める")).toBeVisible();
  await expect(page.getByText("並（60 秒）・トッピングなし")).toBeVisible();
  await expect(remaining).toHaveCount(0);

  // 待っている間に時間が過ぎても、ほかのキーを押しても始まらない
  await page.clock.fastForward(10_000);
  await page.keyboard.press("a");
  await page.keyboard.press("Escape");
  await expect(remaining).toHaveCount(0);
  await expect(page.getByText("スペース か Enter で始める")).toBeVisible();

  // 負荷で実時間が進んでも残り時間がずれないよう、始める前に時計を止め、ここからは明示的に進める
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1_000);

  // スペースで始まると、最初の丼が出て、残り時間は制限時間から減り始める。ページはスクロールしない
  const scrollY = await page.evaluate(() => window.scrollY);
  await page.keyboard.press(" ");
  const servedCount = page.getByText("平らげた杯数").locator("..");
  await expect(remaining).not.toBeEmpty();
  await expect(clock).toHaveText(/残り時間\s*60\s*秒/);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);
  await page.clock.fastForward(1_000);
  await expect(clock).toHaveText(/残り時間\s*59\s*秒/);
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
  // 結果発表の演出は Space で飛ばして、最終の表示を確かめる（演出は result-reveal.spec.ts で確かめる）
  await page.keyboard.press("Space");
  await expect(receiptValue(page, "平らげた杯数")).toHaveText("1 杯");
  // 始めるために押したスペースや、待っている間に押したキーはミスに数えない
  await expect(receiptValue(page, "ミスタイプ数")).toHaveText("1 回");
  await expect(receiptValue(page, "お会計")).toHaveText(/^[\d,]+ 円$/);

  // 結果画面から券売機に戻れる
  await page.getByRole("button", { name: "もう一杯" }).click();
  // 時計を止めているので、券売機へ戻る移り変わり（0.5 秒）を進める
  await page.clock.runFor(500);
  await expect(page.getByRole("button", { name: /^並/ })).toBeVisible();

  expect(errors).toEqual([]);
});

test("開始待ちでは、日本語入力がオンのまま押すと案内が出て始まらず、Enter で始まる", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^並/ }).click();
  await page.getByRole("checkbox", { name: /激辛/ }).check();
  await page.getByRole("button", { name: "いただきます" }).click();
  await expect(page.getByText("並（60 秒）・トッピング: 激辛")).toBeVisible();

  // IME がオンのまま押されたスペース（keyCode 229）では始まらない
  await page.evaluate(() => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: " ", keyCode: 229 }),
    );
  });
  await expect(page.getByText("日本語入力がオンになっています")).toBeVisible();
  const remaining = page.getByTestId("remaining-romaji");
  await expect(remaining).toHaveCount(0);

  await page.keyboard.press("Enter");
  await expect(remaining).not.toBeEmpty();
});
