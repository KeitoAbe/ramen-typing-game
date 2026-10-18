import { expect, type Page, test } from "@e2e/fixtures";
import { LIGHTS_OUT_SECONDS } from "@/client/lib/scene-transition";

// 結果画面の結果発表の演出（docs/design.md の「結果発表の演出」）を確かめる。
// 数字の数え上げは requestAnimationFrame で進むので、page.clock で時刻を止めたり進めたりして調べる。
// 閉店は pauseAt で時刻を飛ばして起こし、時計を止めたまま演出の時計を 0 秒から始める

/** 結果画面の伝票で、見出し（dt）に対応する値（dd）を返す */
function receiptValue(page: Page, label: string) {
  return page
    .locator("dt", { hasText: new RegExp(`^${label}$`) })
    .locator("xpath=following-sibling::dd[1]");
}

/** 並で 1 杯平らげてから閉店させ、結果画面を出す。時計は閉店した時刻で止めておく */
async function closeAfterOneBowl(page: Page) {
  await page.clock.install();
  await page.goto("/");
  await page.getByRole("button", { name: /^並/ }).click();
  await page.getByRole("button", { name: "いただきます" }).click();
  await page.keyboard.press("Enter");
  const remaining = page.getByTestId("remaining-romaji");
  await expect(remaining).not.toBeEmpty();
  await page.keyboard.type((await remaining.textContent()) ?? "");
  await expect(page.getByText("平らげた杯数").locator("..")).toHaveText(
    /平らげた杯数\s*1\s*杯/,
  );
  const now = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(now + 61_000);
  // 閉店すると提灯の灯りが落ちてから結果画面に移るので、その分だけ時計を進める
  await expect(page.getByTestId("scene-transition")).toBeAttached();
  await page.clock.runFor(LIGHTS_OUT_SECONDS * 1000);
  await expect(page.getByRole("heading", { name: "御会計" })).toBeVisible();
}

test("結果画面が出ると、成績の数字とお会計は 0 から数え上がり、3 秒で最終の表示になる", async ({
  page,
}) => {
  await closeAfterOneBowl(page);
  const bill = receiptValue(page, "お会計");

  // 出た瞬間は、見た目の数字は 0。読み上げには最後の値を渡している
  await expect(bill.locator('[aria-hidden="true"]')).toHaveText("0 円");
  await expect(bill.locator(".sr-only")).toHaveText(/^[1-9][\d,]* 円$/);
  const finalBill = (await bill.locator(".sr-only").textContent()) ?? "";

  // 成績の行が先に数え終わり、お会計はそのあとに数え上がる
  await page.clock.runFor(700);
  await expect(
    receiptValue(page, "平らげた杯数").locator('[aria-hidden="true"]'),
  ).toHaveText("1 杯");
  await expect(bill.locator('[aria-hidden="true"]')).toHaveText("0 円");

  await page.clock.runFor(3_000);
  await expect(bill).toHaveText(finalBill);
  await expect(receiptValue(page, "平らげた杯数")).toHaveText("1 杯");
  await expect(
    page.locator('[class~="motion-safe:animate-balance-pop"]'),
  ).toHaveCount(0);
});

test("演出の途中で Space を押すと、最終の表示になる", async ({ page }) => {
  await closeAfterOneBowl(page);
  await page.keyboard.press("Space");
  await expect(receiptValue(page, "平らげた杯数")).toHaveText("1 杯");
  await expect(receiptValue(page, "お会計")).toHaveText(/^[1-9][\d,]* 円$/);
  await expect(
    page.locator('[class~="motion-safe:animate-stamp-press"]'),
  ).toHaveCount(0);
});

test("演出の途中で伝票をクリックすると、最終の表示になる", async ({ page }) => {
  await closeAfterOneBowl(page);
  await page.getByRole("heading", { name: "御会計" }).click();
  await expect(receiptValue(page, "お会計")).toHaveText(/^[1-9][\d,]* 円$/);
});

test("演出の途中でも「もう一杯」を押せる", async ({ page }) => {
  await closeAfterOneBowl(page);
  await page.getByRole("button", { name: "もう一杯" }).click();
  await expect(page.getByRole("button", { name: /^並/ })).toBeVisible();
});

test("初めて遊んで自己ベストを更新したら、判子のあとに紙吹雪が舞い、新記録の札が弾む", async ({
  page,
}) => {
  await closeAfterOneBowl(page);
  // 判子が押されるまでは、新記録の札も自己ベストの行も足さない（読み上げが判子より先に始まらない）
  await page.clock.runFor(2_000);
  await expect(page.getByText("新記録")).toHaveCount(0);
  await expect(page.getByText(/の自己ベスト:/)).toHaveCount(0);
  // 判子を押し終える 2.2 秒のあと、演出が終わる 2.9 秒より前
  await page.clock.runFor(400);
  await expect(page.getByText("新記録")).toBeVisible();
  await expect(page.getByText(/の自己ベスト:/)).toBeVisible();
  await expect(
    page.locator('[class~="motion-safe:animate-confetti-fall"]'),
  ).toHaveCount(14);
  await expect(
    page.locator('[class~="motion-safe:animate-record-pop"]'),
  ).toHaveCount(1);
});

test.describe("動きを抑える設定", () => {
  test.use({ reducedMotion: "reduce" });

  test("最初から最終の表示で出し、紙吹雪は出さない", async ({ page }) => {
    await closeAfterOneBowl(page);
    await expect(receiptValue(page, "平らげた杯数")).toHaveText("1 杯");
    await expect(receiptValue(page, "お会計")).toHaveText(/^[1-9][\d,]* 円$/);
    await expect(page.getByText("新記録")).toBeVisible();
    await expect(
      page.locator('[class~="motion-safe:animate-confetti-fall"]'),
    ).toHaveCount(0);
    // 演出の動きが付いていない
    const animations = await page
      .getByTestId("game-stage")
      .evaluate((stage) =>
        stage
          .getAnimations({ subtree: true })
          .map((animation) => (animation as CSSAnimation).animationName),
      );
    expect(animations).toEqual([]);
  });
});
