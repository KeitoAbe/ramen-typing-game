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

// 広告枠の配置。E2E のビルドにはダミーの広告ユニットの ID を渡している（playwright.config.ts）。
// 広告は紹介の後ろの 1 枠だけで、操作が目的の舞台の周囲には置かない
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
 * 広告枠が 1 つだけで、舞台から 24px 以上離れ、紹介の文章と重ならず、
 * ページが横にはみ出さないことを確かめる
 */
async function expectAdApart(page: Page) {
  // 舞台の下や右など、紹介の後ろ以外に広告枠が無い
  await expect(page.locator("ins.adsbygoogle")).toHaveCount(1);
  const stage = await boxOf(page.getByTestId("game-stage"));
  const guide = await boxOf(page.locator("article"));
  const ad = await boxOf(adOf(page, GUIDE_AD_SLOT_ID));
  expect(isApart(stage, ad, MIN_AD_GAP_PX)).toBe(true);
  expect(isApart(guide, ad, 0)).toBe(true);
  const viewportWidth = await page.evaluate(
    () => document.documentElement.clientWidth,
  );
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(viewportWidth);
}

test.describe("1366×768 のウィンドウ", () => {
  test.use({ viewport: { width: 1366, height: 768 } });

  test("ヘッダー・幅 960px の舞台がスクロールせずに見え、その下に紹介が始まる", async ({
    page,
  }) => {
    await page.goto("/");
    const header = page.getByRole("banner");

    await expect(header).toContainText("ラーメン屋台タイピング");
    // ヘッダーのサイト名は見出しにせず、h1 は紹介の 1 つだけ
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

    const headerBox = await boxOf(header);
    const stageBox = await boxOf(page.getByTestId("game-stage"));
    const guideBox = await boxOf(page.locator("article"));

    expect(stageBox.width).toBe(960);
    expect(stageBox.height).toBe(540);
    // 舞台を左右の中央に置く（スクロールバーの幅だけずれてもよい）
    const viewportWidth = await page.evaluate(
      () => document.documentElement.clientWidth,
    );
    expect(
      Math.abs(stageBox.x + stageBox.width / 2 - viewportWidth / 2),
    ).toBeLessThanOrEqual(1);
    expect(headerBox.y + headerBox.height).toBeLessThanOrEqual(stageBox.y);
    // 紹介の領域は舞台の下から始まる
    expect(guideBox.y).toBeGreaterThanOrEqual(stageBox.y + stageBox.height);
    // ヘッダーのサイト名は舞台の左端にそろえる
    const logoBox = await boxOf(header.getByRole("link"));
    expect(Math.abs(logoBox.x - stageBox.x)).toBeLessThanOrEqual(1);
    await expectAdApart(page);
  });

  test("広告枠は読み込みの前から場所を確保していて、決まった高さを持つ", async ({
    page,
  }) => {
    await page.goto("/");
    // スクリプトは空のものに差し替えているので、広告が入らない状態の大きさを見る
    const ins = await boxOf(
      page.locator(`ins[data-ad-slot="${GUIDE_AD_SLOT_ID}"]`),
    );
    expect(ins.height).toBe(280);
  });

  test("券売機・トッピング・プレイ中・結果画面の文字が 12px 以上で舞台からはみ出さず、舞台の四隅まで背景で埋まる", async ({
    page,
  }) => {
    // 提灯の揺れや湯気は止まらずに動き続け、ヘッドレスのブラウザはそれを毎フレーム CPU で描き直す。
    // 並列で走らせると CPU を取り合って 30 秒を超えるので、動きを抑える設定で開く。
    // 動きは文字の大きさや位置を変えず、止めれば動きの途中ではなく収まった位置を測れる
    await page.emulateMedia({ reducedMotion: "reduce" });
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

    // 始めるのを待つ画面（日本語入力の案内も出した状態で測る）
    await page.getByRole("button", { name: "いただきます" }).click();
    await expect(page.getByText("スペース か Enter で始める")).toBeVisible();
    await page.evaluate(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Process", keyCode: 229 }),
      );
    });
    await expect(
      page.getByText("日本語入力がオンになっています"),
    ).toBeVisible();
    await expectIntactStage(page);

    // プレイ中
    await page.keyboard.press("Enter");
    const remaining = page.getByTestId("remaining-romaji");
    await expect(remaining).not.toBeEmpty();
    await expectIntactStage(page);

    // 閉店間際（残り 15 秒を切ると札が替わる）。
    // runFor は 100ms ごとの tick を数百回起こして描き直すので重い。
    // ゲームの状態は tick の時刻から決まるので、fastForward で時刻を飛ばし、tick は 1 回だけ起こす
    await page.clock.fastForward(50_000);
    await expect(page.getByText("閉店間際！")).toBeVisible();
    await expectIntactStage(page);

    // 結果画面
    await page.clock.fastForward(11_000);
    await expect(page.getByRole("heading", { name: "御会計" })).toBeVisible();
    await expectIntactStage(page);
  });
});

test.describe("1920px 幅のウィンドウ", () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  test("広い画面でも舞台の右に広告枠は出ず、舞台は中央でサイト名と左端がそろう", async ({
    page,
  }) => {
    await page.goto("/");
    const stageBox = await boxOf(page.getByTestId("game-stage"));
    const viewportWidth = await page.evaluate(
      () => document.documentElement.clientWidth,
    );
    expect(
      Math.abs(stageBox.x + stageBox.width / 2 - viewportWidth / 2),
    ).toBeLessThanOrEqual(1);
    const logoBox = await boxOf(page.getByRole("banner").getByRole("link"));
    expect(Math.abs(logoBox.x - stageBox.x)).toBeLessThanOrEqual(1);
    await expectAdApart(page);
  });

  test("広告は紹介の後ろの枠だけを一度要求する", async ({ page }) => {
    await page.goto("/");
    // スクリプトは空のものに差し替えているので、要求（push）は配列に残る
    await expect
      .poll(() => page.evaluate(() => window.adsbygoogle?.length ?? 0))
      .toBe(1);
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

  test("紹介の後ろの広告枠は幅に合わせて縮み、舞台や紹介と重ならない", async ({
    page,
  }) => {
    await page.goto("/");
    const adBox = await boxOf(adOf(page, GUIDE_AD_SLOT_ID));
    expect(adBox.width).toBeLessThanOrEqual(390);
    await expectAdApart(page);
  });
});

// 縦向きのスマホでは舞台が小さく、舞台の中に案内を置くと看板の後ろに隠れる。
// どの向き・幅でも、案内が最初の画面に収まり、ヘッダーや舞台と重ならず、いちばん手前に描かれることを確かめる
for (const viewport of [
  { width: 360, height: 780 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 844, height: 390 },
  { width: 768, height: 1024 },
]) {
  test.describe(`タッチ端末（${viewport.width}×${viewport.height}）`, () => {
    test.use({ viewport, hasTouch: true, isMobile: true });

    test("遊べない案内が全文見え、ほかの要素と重ならない", async ({ page }) => {
      await page.goto("/");
      const notice = page.locator("p", {
        hasText: "PC のキーボードで遊んでください",
      });
      await expect(notice).toBeVisible();
      await expect(notice).toContainText("タッチ操作では文字を打てません");
      const noticeBox = await boxOf(notice);
      expect(noticeBox.x).toBeGreaterThanOrEqual(0);
      expect(noticeBox.x + noticeBox.width).toBeLessThanOrEqual(viewport.width);
      expect(noticeBox.y + noticeBox.height).toBeLessThanOrEqual(
        viewport.height,
      );
      expect(
        isApart(noticeBox, await boxOf(page.getByTestId("game-stage")), 0),
      ).toBe(true);
      expect(isApart(noticeBox, await boxOf(page.getByRole("banner")), 0)).toBe(
        true,
      );
      // 2 行それぞれの真ん中で、いちばん手前にあるのが案内の文字であること
      for (const line of [
        "PC のキーボードで遊んでください",
        "タッチ操作では文字を打てません",
      ]) {
        const lineBox = await boxOf(notice.getByText(line));
        const topText = await page.evaluate(
          ([x, y]) => document.elementFromPoint(x, y)?.textContent,
          [lineBox.x + lineBox.width / 2, lineBox.y + lineBox.height / 2],
        );
        expect(topText).toBe(line);
      }
    });
  });
}

test.describe("PC", () => {
  test("遊べない案内は出ない", async ({ page }) => {
    await page.goto("/");
    // 案内は水和のあとに出るので、ボタンが効くようになってから確かめる
    await page.getByRole("button", { name: /^効果音/ }).click();
    await expect(
      page.getByRole("button", { name: "効果音: オフ" }),
    ).toBeVisible();
    await expect(page.getByText("PC のキーボードで遊んでください")).toHaveCount(
      0,
    );
  });
});
