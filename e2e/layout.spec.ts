import { expect, type Page, test } from "@playwright/test";

// 舞台は全画面にせず、幅 960px（高さ 540px）までの大きさでページの中に置く。
// その大きさで舞台の中の文字が読めること（12px 以上）と、ページが横にはみ出さないことを確かめる

const MIN_FONT_PX = 12;

/**
 * 舞台の中で見えている文字のうち、12px より小さく描かれているものを返す。
 * SVG の文字は、viewBox の拡大・縮小をかけた大きさで比べる
 */
async function smallTexts(page: Page) {
  return page.getByTestId("game-stage").evaluate((stage, minPx) => {
    const found: { text: string; px: number }[] = [];
    for (const element of stage.querySelectorAll<HTMLElement | SVGElement>(
      "*",
    )) {
      const ownText = Array.from(element.childNodes)
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent ?? "")
        .join("")
        .trim();
      if (ownText === "") continue;
      // 読み上げ用の文字は画面に出ないので除く
      if (element.closest(".sr-only")) continue;
      const style = getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") continue;
      const fontPx = Number.parseFloat(style.fontSize);
      const scale =
        element instanceof SVGGraphicsElement
          ? (element.getScreenCTM()?.a ?? 1)
          : 1;
      const px = fontPx * scale;
      if (px < minPx) found.push({ text: ownText, px });
    }
    return found;
  }, MIN_FONT_PX);
}

/** 舞台の外にはみ出している文字を返す */
async function textsOutsideStage(page: Page) {
  return page.getByTestId("game-stage").evaluate((stage) => {
    const bounds = stage.getBoundingClientRect();
    const found: string[] = [];
    for (const element of stage.querySelectorAll<HTMLElement>("p, span, li")) {
      if (element.closest(".sr-only")) continue;
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (
        rect.left < bounds.left - 1 ||
        rect.right > bounds.right + 1 ||
        rect.top < bounds.top - 1 ||
        rect.bottom > bounds.bottom + 1
      ) {
        found.push(element.textContent?.trim() ?? "");
      }
    }
    return found;
  });
}

async function expectReadableStage(page: Page) {
  expect(await smallTexts(page)).toEqual([]);
  expect(await textsOutsideStage(page)).toEqual([]);
}

test.describe("1366×768 のウィンドウ", () => {
  test.use({ viewport: { width: 1366, height: 768 } });

  test("ヘッダーと幅 960px の舞台がスクロールせずに見え、その下に紹介が始まる", async ({
    page,
  }) => {
    await page.goto("/");
    const header = page.getByRole("banner");
    const stage = page.getByTestId("game-stage");
    const guideHeading = page.getByRole("heading", { level: 1 });

    await expect(header).toContainText("ラーメン屋台タイピング");
    // ヘッダーのサイト名は見出しにせず、h1 は紹介の 1 つだけ
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

    const headerBox = await header.boundingBox();
    const stageBox = await stage.boundingBox();
    const guideBox = await guideHeading.boundingBox();
    if (!headerBox || !stageBox || !guideBox) throw new Error("要素が無い");

    expect(stageBox.width).toBe(960);
    expect(stageBox.height).toBe(540);
    // 左右の中央に置く（スクロールバーの幅だけずれてもよい）
    const viewportWidth = await page.evaluate(
      () => document.documentElement.clientWidth,
    );
    expect(
      Math.abs(stageBox.x + stageBox.width / 2 - viewportWidth / 2),
    ).toBeLessThanOrEqual(1);
    expect(headerBox.y + headerBox.height).toBeLessThanOrEqual(stageBox.y);
    expect(stageBox.y + stageBox.height).toBeLessThanOrEqual(768);
    // 紹介の領域の始まり（見出し）が、開いたときの画面の中に見える
    expect(guideBox.y).toBeLessThan(768);
  });

  test("券売機・スタンプカード・トッピング・プレイ中・結果画面の文字が 12px 以上で、舞台からはみ出さない", async ({
    page,
  }) => {
    await page.clock.install();
    await page.goto("/");

    // 券売機
    await expectReadableStage(page);

    // スタンプカード
    await page.getByRole("button", { name: /スタンプカード/ }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expectReadableStage(page);
    await page.getByRole("button", { name: "閉じる" }).click();

    // トッピング
    await page.getByRole("button", { name: /^並/ }).click();
    await expect(
      page.getByRole("button", { name: "いただきます" }),
    ).toBeVisible();
    await page.getByRole("checkbox").first().check();
    await expectReadableStage(page);

    // プレイ中
    await page.getByRole("button", { name: "いただきます" }).click();
    const remaining = page.getByTestId("remaining-romaji");
    await expect(remaining).not.toBeEmpty();
    await expectReadableStage(page);

    // 閉店間際（残り 15 秒を切ると札が替わる）
    await page.clock.runFor(50_000);
    await expect(page.getByText("閉店間際！")).toBeVisible();
    await expectReadableStage(page);

    // 結果画面
    await page.clock.runFor(11_000);
    await expect(page.getByRole("heading", { name: "御会計" })).toBeVisible();
    await expectReadableStage(page);
  });
});

test.describe("幅 960px より狭いウィンドウ", () => {
  test.use({ viewport: { width: 800, height: 600 } });

  test("舞台はウィンドウの幅に合わせて縮み、横にはみ出さない", async ({
    page,
  }) => {
    await page.goto("/");
    const stageBox = await page.getByTestId("game-stage").boundingBox();
    if (!stageBox) throw new Error("舞台が無い");
    const viewportWidth = await page.evaluate(
      () => document.documentElement.clientWidth,
    );
    expect(stageBox.width).toBeLessThanOrEqual(viewportWidth);
    expect(stageBox.width).toBeGreaterThan(viewportWidth - 2);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(viewportWidth);
  });
});

test.describe("スマホ（390px 幅）", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  test("遊べない案内が出て、横にはみ出さない", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByText("PC のキーボードで遊んでください"),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);
  });
});
