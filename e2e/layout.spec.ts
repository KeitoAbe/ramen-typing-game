import { expect, type Page, test } from "@e2e/fixtures";

// 舞台は全画面にせず、幅 960px（高さ 540px）までの大きさでページの中に置く。
// その大きさで舞台の中の文字が読めること（12px 以上）、舞台の四隅まで舞台の背景で埋まっていること、
// ページが横にはみ出さないことを確かめる

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

/**
 * 舞台の四隅のうち、ページの背景と同じ色で塗られている隅を返す。
 * そこでは舞台の外と見分けがつかず、舞台の背景が途中で切れて見える
 */
async function cornersBlendingIntoPage(page: Page) {
  return page.getByTestId("game-stage").evaluate((stage) => {
    const pageBackground = getComputedStyle(document.body).backgroundColor;
    const bounds = stage.getBoundingClientRect();
    const corners = {
      左上: [bounds.left + 2, bounds.top + 2],
      右上: [bounds.right - 2, bounds.top + 2],
      左下: [bounds.left + 2, bounds.bottom - 2],
      右下: [bounds.right - 2, bounds.bottom - 2],
    } as const;
    return Object.entries(corners)
      .filter(([, [x, y]]) => {
        const top = document.elementFromPoint(x, y);
        if (!top) return true;
        const style = getComputedStyle(top);
        const paint =
          top instanceof SVGElement ? style.fill : style.backgroundColor;
        return paint === pageBackground;
      })
      .map(([name]) => name);
  });
}

async function expectIntactStage(page: Page) {
  expect(await smallTexts(page)).toEqual([]);
  expect(await textsOutsideStage(page)).toEqual([]);
  expect(await cornersBlendingIntoPage(page)).toEqual([]);
}

// 広告枠の配置。E2E のビルドには枠ごとにダミーの広告ユニットの ID を渡している（playwright.config.ts）
const STAGE_BOTTOM_AD_SLOT_ID = "2222222222";
const STAGE_SIDE_AD_SLOT_ID = "3333333333";
const GUIDE_AD_SLOT_ID = "1111111111";
/** 誤クリックを誘わないよう、舞台と広告枠のあいだに空ける距離（px） */
const MIN_AD_GAP_PX = 24;

type Box = { x: number; y: number; width: number; height: number };

/** 広告ユニットの ID から、その広告枠（「広告」の見出しを含む aside）を探す */
function adOf(page: Page, slotId: string) {
  return page.locator("aside", {
    has: page.locator(`ins[data-ad-slot="${slotId}"]`),
  });
}

async function boxOf(locator: ReturnType<Page["locator"]>): Promise<Box> {
  const box = await locator.boundingBox();
  if (!box) throw new Error("要素が見えていない");
  return box;
}

/** 2 つの箱が、上下か左右のどちらかに gap 以上離れているか */
function isApart(a: Box, b: Box, gap: number): boolean {
  return (
    b.x - (a.x + a.width) >= gap ||
    a.x - (b.x + b.width) >= gap ||
    b.y - (a.y + a.height) >= gap ||
    a.y - (b.y + b.height) >= gap
  );
}

/**
 * 見えている広告枠が、舞台から 24px 以上離れ、紹介の文章や互いに重ならず、
 * ページが横にはみ出さないことを確かめる
 */
async function expectAdsApart(page: Page) {
  const stage = await boxOf(page.getByTestId("game-stage"));
  const guide = await boxOf(page.locator("article"));
  const ads: Box[] = [];
  for (const slotId of [
    STAGE_BOTTOM_AD_SLOT_ID,
    STAGE_SIDE_AD_SLOT_ID,
    GUIDE_AD_SLOT_ID,
  ]) {
    const ad = adOf(page, slotId);
    if (await ad.isVisible()) ads.push(await boxOf(ad));
  }
  for (const [index, ad] of ads.entries()) {
    expect(isApart(stage, ad, MIN_AD_GAP_PX)).toBe(true);
    expect(isApart(guide, ad, 0)).toBe(true);
    for (const other of ads.slice(index + 1)) {
      expect(isApart(ad, other, 0)).toBe(true);
    }
  }
  const viewportWidth = await page.evaluate(
    () => document.documentElement.clientWidth,
  );
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(viewportWidth);
}

test.describe("1366×768 のウィンドウ", () => {
  test.use({ viewport: { width: 1366, height: 768 } });

  test("ヘッダー・幅 960px の舞台・舞台の下の広告枠がスクロールせずに見え、その下に紹介が始まる", async ({
    page,
  }) => {
    await page.goto("/");
    const header = page.getByRole("banner");

    await expect(header).toContainText("ラーメン屋台タイピング");
    // ヘッダーのサイト名は見出しにせず、h1 は紹介の 1 つだけ
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

    const headerBox = await boxOf(header);
    const stageBox = await boxOf(page.getByTestId("game-stage"));
    const bottomAdBox = await boxOf(adOf(page, STAGE_BOTTOM_AD_SLOT_ID));
    const sideAdBox = await boxOf(adOf(page, STAGE_SIDE_AD_SLOT_ID));
    const guideBox = await boxOf(page.locator("article"));

    expect(stageBox.width).toBe(960);
    expect(stageBox.height).toBe(540);
    // 舞台と右の縦長の枠をまとめて左右の中央に置く（スクロールバーの幅だけずれてもよい）
    const viewportWidth = await page.evaluate(
      () => document.documentElement.clientWidth,
    );
    const groupCenter = (stageBox.x + sideAdBox.x + sideAdBox.width) / 2;
    expect(Math.abs(groupCenter - viewportWidth / 2)).toBeLessThanOrEqual(1);
    expect(headerBox.y + headerBox.height).toBeLessThanOrEqual(stageBox.y);
    // 舞台のすぐ下の横長の枠（728×90）まで、開いたときの画面の中に見える
    expect(bottomAdBox.width).toBe(728);
    expect(bottomAdBox.y + bottomAdBox.height).toBeLessThanOrEqual(768);
    // 紹介の領域は広告枠の下から始まる
    expect(guideBox.y).toBeGreaterThanOrEqual(
      bottomAdBox.y + bottomAdBox.height,
    );
    await expectAdsApart(page);
  });

  test("広告枠は読み込みの前から場所を確保していて、決まった高さを持つ", async ({
    page,
  }) => {
    await page.goto("/");
    // スクリプトは空のものに差し替えているので、広告が入らない状態の大きさを見る
    const bottomIns = await boxOf(
      page.locator(`ins[data-ad-slot="${STAGE_BOTTOM_AD_SLOT_ID}"]`),
    );
    const sideIns = await boxOf(
      page.locator(`ins[data-ad-slot="${STAGE_SIDE_AD_SLOT_ID}"]`),
    );
    expect(bottomIns.height).toBe(90);
    expect(sideIns.width).toBe(300);
    expect(sideIns.height).toBe(600);
  });

  test("券売機・トッピング・プレイ中・結果画面の文字が 12px 以上で舞台からはみ出さず、舞台の四隅まで背景で埋まる", async ({
    page,
  }) => {
    await page.clock.install();
    await page.goto("/");

    // 券売機
    await expectIntactStage(page);

    // トッピング
    await page.getByRole("button", { name: /^並/ }).click();
    await expect(
      page.getByRole("button", { name: "いただきます" }),
    ).toBeVisible();
    await page.getByRole("checkbox").first().check();
    await expectIntactStage(page);

    // プレイ中
    await page.getByRole("button", { name: "いただきます" }).click();
    const remaining = page.getByTestId("remaining-romaji");
    await expect(remaining).not.toBeEmpty();
    await expectIntactStage(page);

    // 閉店間際（残り 15 秒を切ると札が替わる）
    await page.clock.runFor(50_000);
    await expect(page.getByText("閉店間際！")).toBeVisible();
    await expectIntactStage(page);

    // 結果画面
    await page.clock.runFor(11_000);
    await expect(page.getByRole("heading", { name: "御会計" })).toBeVisible();
    await expectIntactStage(page);
  });
});

test.describe("1920px 幅のウィンドウ", () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  test("舞台の右に縦長の広告枠があり、どの広告枠も舞台や紹介と重ならない", async ({
    page,
  }) => {
    await page.goto("/");
    const stageBox = await boxOf(page.getByTestId("game-stage"));
    const sideAdBox = await boxOf(adOf(page, STAGE_SIDE_AD_SLOT_ID));
    await expect(adOf(page, STAGE_BOTTOM_AD_SLOT_ID)).toBeVisible();
    expect(sideAdBox.x).toBeGreaterThanOrEqual(stageBox.x + stageBox.width);
    await expectAdsApart(page);
  });
});

test.describe("幅 1360px より狭いウィンドウ", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("舞台の右の縦長の広告枠は出さず、舞台を中央に置く", async ({ page }) => {
    await page.goto("/");
    await expect(adOf(page, STAGE_BOTTOM_AD_SLOT_ID)).toBeVisible();
    await expect(adOf(page, STAGE_SIDE_AD_SLOT_ID)).toBeHidden();
    const stageBox = await boxOf(page.getByTestId("game-stage"));
    const viewportWidth = await page.evaluate(
      () => document.documentElement.clientWidth,
    );
    expect(
      Math.abs(stageBox.x + stageBox.width / 2 - viewportWidth / 2),
    ).toBeLessThanOrEqual(1);
    await expectAdsApart(page);
  });

  test("あとからウィンドウを広げると、右の縦長の枠を出して広告を一度だけ要求する", async ({
    page,
  }) => {
    await page.goto("/");
    // スクリプトは空のものに差し替えているので、要求（push）は配列に残る
    const requestCount = () =>
      page.evaluate(() => window.adsbygoogle?.length ?? 0);
    // 舞台の下の枠と紹介の後ろの枠だけを要求し、隠している右の枠は要求しない
    await expect.poll(requestCount).toBe(2);

    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(adOf(page, STAGE_SIDE_AD_SLOT_ID)).toBeVisible();
    await expect.poll(requestCount).toBe(3);

    // 狭めて広げ直しても、同じ枠に二度は要求しない
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(adOf(page, STAGE_SIDE_AD_SLOT_ID)).toBeHidden();
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(adOf(page, STAGE_SIDE_AD_SLOT_ID)).toBeVisible();
    expect(await requestCount()).toBe(3);
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

  test("舞台の下の広告枠は幅に合わせて縮み、舞台や紹介と重ならない", async ({
    page,
  }) => {
    await page.goto("/");
    const bottomAdBox = await boxOf(adOf(page, STAGE_BOTTOM_AD_SLOT_ID));
    expect(bottomAdBox.width).toBeLessThanOrEqual(390);
    await expect(adOf(page, STAGE_SIDE_AD_SLOT_ID)).toBeHidden();
    await expectAdsApart(page);
  });
});
