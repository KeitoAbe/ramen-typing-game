import { expect, type Locator, type Page, test } from "@e2e/fixtures";

// 画面の切り替えの移り変わり（docs/design.md の「画面の切り替え」）を確かめる

/** 移り変わりの絵の中で動いている CSS アニメーションの名前 */
function transitionAnimationNames(page: Page) {
  return page
    .getByTestId("scene-transition")
    .evaluate((element) =>
      element
        .getAnimations({ subtree: true })
        .map((animation) => (animation as CSSAnimation).animationName),
    );
}

/** 結果画面の伝票で、見出し（dt）に対応する値（dd）を返す */
function receiptValue(page: Page, label: string): Locator {
  return page
    .locator("dt", { hasText: new RegExp(`^${label}$`) })
    .locator("xpath=following-sibling::dd[1]");
}

/** 画面が替わったことを知らせる読み上げの文 */
function announcement(page: Page) {
  return page.getByTestId("scene-announcement");
}

test("食券を買う・閉店する・もう一杯で、それぞれの移り変わりが動き、終わるとフォーカスが次の画面に移る", async ({
  page,
}) => {
  // 移り変わりを外すのはタイマーなので、時計を止めて、移り変わりの途中を落ち着いて調べる
  await page.clock.install();
  await page.goto("/");
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1_000);
  const overlay = page.getByTestId("scene-transition");

  // 券売機 → トッピング: 食券が出てくるのを待つと、食券は飛ばさず、その場で切り替わって最初のトッピングにフォーカスが移る
  await page.getByRole("button", { name: /^並/ }).click();
  await page.clock.runFor(750);
  await expect(page.getByRole("checkbox").first()).toBeFocused();
  await expect(overlay).toHaveCount(0);
  await expect(announcement(page)).toHaveText(/トッピングを選んでください/);

  // トッピング → 開始待ち: のれんは出さず、その場で切り替わって始め方の案内にフォーカスが移る
  await page.getByRole("button", { name: "いただきます" }).click();
  await expect(overlay).toHaveCount(0);
  const sign = page.getByText("スペース か Enter で始める").locator("..");
  await expect(sign).toBeFocused();
  await expect(announcement(page)).toHaveText(/のれんをくぐりました/);

  // プレイ → 結果: 閉店させ、灯りが落ちているあいだに打ったキーは数えない
  await page.keyboard.press(" ");
  const remaining = page.getByTestId("remaining-romaji");
  await expect(remaining).not.toBeEmpty();
  // 開始待ち → プレイには移り変わりを付けないが、画面が替わったことは知らせる
  await expect(announcement(page)).toHaveText("開店しました");
  await page.clock.fastForward(61_000);
  await expect(overlay).toBeAttached();
  expect(await transitionAnimationNames(page)).toContain("lights-out");
  await expect(page.getByRole("heading", { name: "御会計" })).toHaveCount(0);
  // 伝票が出る前には、伝票のことを知らせない
  await expect(announcement(page)).toHaveText("");
  await page.keyboard.type((await remaining.textContent()) ?? "");
  await page.keyboard.press("1");

  await page.clock.runFor(300);
  await expect(page.getByRole("heading", { name: "御会計" })).toBeVisible();
  expect(await transitionAnimationNames(page)).toContain("scene-veil-out");
  await page.clock.runFor(300);
  await expect(overlay).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "御会計" })).toBeFocused();
  await expect(announcement(page)).toHaveText(/お会計の伝票です/);
  // 演出の途中なので、数え上げの途中の数字ではなく、読み上げに渡す最後の値で確かめる
  await expect(
    receiptValue(page, "正しく打ったキー数").locator(".sr-only"),
  ).toHaveText("0 回");
  await expect(
    receiptValue(page, "ミスタイプ数").locator(".sr-only"),
  ).toHaveText("0 回");

  // 結果 → 券売機: 夜の幕が流れ、終わると最初の食券のボタンにフォーカスが移る
  await page.getByRole("button", { name: "もう一杯" }).click();
  expect(await transitionAnimationNames(page)).toContain("back-to-machine");
  await page.clock.runFor(500);
  await expect(overlay).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^並/ })).toBeFocused();
  await expect(announcement(page)).toHaveText(/券売機の前に戻りました/);
});

test("「いただきます」を押してすぐにスペースで始めると、移り変わりなしでプレイの画面を出す", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^並/ }).click();
  await page.getByRole("button", { name: "いただきます" }).click();
  await page.keyboard.press(" ");
  await expect(page.getByTestId("remaining-romaji")).not.toBeEmpty();
  await expect(page.getByTestId("scene-transition")).toHaveCount(0);
});

test("動きを抑える設定では、移り変わりのある切り替えは夜の色の幕が薄れるだけにし、閉店してすぐ結果画面を出す", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  await page.goto("/");
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1_000);
  const overlay = page.getByTestId("scene-transition");

  // 券売機 → トッピングと、トッピング → 開始待ちには、動きを抑える設定でも幕を出さない
  await page.getByRole("button", { name: /^並/ }).click();
  await expect(page.getByRole("checkbox").first()).toBeFocused();
  await expect(overlay).toHaveCount(0);

  await page.getByRole("button", { name: "いただきます" }).click();
  await expect(overlay).toHaveCount(0);

  await page.keyboard.press(" ");
  await expect(page.getByTestId("remaining-romaji")).not.toBeEmpty();
  // 灯りが落ちるのを待たないので、閉店したらすぐに結果画面が出る
  await page.clock.fastForward(61_000);
  await expect(page.getByRole("heading", { name: "御会計" })).toBeVisible();
  expect(await transitionAnimationNames(page)).toEqual(["scene-veil-out"]);
});
