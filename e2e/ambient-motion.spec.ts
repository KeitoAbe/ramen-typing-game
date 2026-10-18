import { expect, type Page, test } from "@e2e/fixtures";

// 屋台の背景の生活感のある動き（docs/design.md の「動き」）を確かめる。
// CSS の動きは page.clock では進まないので、Web Animations API で再生位置を動かして調べる

const CAT = 'g[class~="motion-safe:animate-stray-cat"]';

/** 舞台の背景の絵（svg）の中で動いているもののアニメーション名 */
async function sceneAnimationNames(page: Page) {
  return page.getByTestId("game-stage").evaluate((stage) =>
    stage
      .getAnimations({ subtree: true })
      .filter((animation) =>
        (animation.effect as KeyframeEffect | null)?.target?.closest("svg"),
      )
      .map((animation) => (animation as CSSAnimation).animationName),
  );
}

async function startPlaying(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /^並/ }).click();
  await page.getByRole("button", { name: "いただきます" }).click();
  await expect(page.getByTestId("remaining-romaji")).not.toBeEmpty();
}

test("券売機の画面で、星はばらばらに瞬き、提灯とのれんが揺れる", async ({
  page,
}) => {
  await page.goto("/");
  const names = await sceneAnimationNames(page);
  expect(names.filter((name) => name === "star-twinkle")).toHaveLength(18);
  expect(names.filter((name) => name === "noren-flutter")).toHaveLength(4);
  expect(names.filter((name) => name === "lantern-sway")).toHaveLength(2);

  // 星ごとに瞬く長さと始まりが違い、一斉に点滅しない
  const twinkles = await page.getByTestId("game-stage").evaluate((stage) =>
    stage
      .getAnimations({ subtree: true })
      .filter(
        (animation) =>
          (animation as CSSAnimation).animationName === "star-twinkle",
      )
      .map((animation) => {
        const timing = animation.effect?.getComputedTiming();
        return `${timing?.duration}/${timing?.delay}`;
      }),
  );
  expect(new Set(twinkles).size).toBe(twinkles.length);
});

test("プレイ中、猫は屋根の上を 2 回横切り、丼や注文の札より下には来ない", async ({
  page,
}) => {
  await startPlaying(page);

  const crossings = await page
    .getByTestId("game-stage")
    .evaluate((stage, selector) => {
      const cat = stage.querySelector<SVGGElement>(selector);
      const animation = cat
        ?.getAnimations()
        .find((item) => (item as CSSAnimation).animationName === "stray-cat");
      if (!cat || !animation) return null;
      animation.pause();
      const bounds = stage.getBoundingClientRect();
      // 屋根の棟（1280×720 の絵で y 104）と、丼の上端（舞台の高さの 39.5%）
      const ridgeY = bounds.top + (bounds.height * 104) / 720;
      const bowlTopY = bounds.top + bounds.height * 0.395;
      let visibleCount = 0;
      let wasVisible = false;
      let lowestBottom = Number.NEGATIVE_INFINITY;
      for (let ms = 0; ms <= 120_000; ms += 500) {
        animation.currentTime = ms;
        const rect = cat.getBoundingClientRect();
        lowestBottom = Math.max(lowestBottom, rect.bottom);
        const isVisible = rect.top < ridgeY;
        if (isVisible && !wasVisible) visibleCount++;
        wasVisible = isVisible;
      }
      return { visibleCount, belowBowlTop: lowestBottom > bowlTopY };
    }, CAT);
  expect(crossings).toEqual({ visibleCount: 2, belowBowlTop: false });
});

test("猫は画面ごとに数え直さないよう、トッピングの画面には出さず、プレイの画面でだけ出す", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^並/ }).click();
  await expect(
    page.getByRole("button", { name: "いただきます" }),
  ).toBeVisible();
  await expect(page.locator(CAT)).toHaveCount(0);

  await page.getByRole("button", { name: "いただきます" }).click();
  await expect(page.getByTestId("remaining-romaji")).not.toBeEmpty();
  await expect(page.locator(CAT)).toHaveCount(1);
});

test("動きを抑える設定では、屋台の背景を動かさず、猫も出さない", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  expect(await sceneAnimationNames(page)).toEqual([]);

  await page.getByRole("button", { name: /^並/ }).click();
  await page.getByRole("button", { name: "いただきます" }).click();
  await expect(page.getByTestId("remaining-romaji")).not.toBeEmpty();
  expect(await sceneAnimationNames(page)).toEqual([]);
  await expect(page.locator(CAT)).toBeHidden();
});
