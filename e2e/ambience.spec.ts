import { expect, type Page, test } from "@e2e/fixtures";

// 環境音・BGM がプレイ中だけ流れ、効果音とは別の札で切り替えられ、設定が再読み込みしても残ることを確かめる。
// 音そのものは聞けないので、寸胴の煮える音（繰り返し鳴らし続ける唯一の音源）が鳴り始めたか・止まったかを記録して見る

/** 繰り返し鳴らす音源の start / stop を記録する。今鳴っている数を window.__loopingSources で読む */
async function recordLoopingSources(page: Page) {
  await page.addInitScript(() => {
    const state = { playing: 0 };
    Object.assign(window, { __loopingSources: state });
    const { start, stop } = AudioBufferSourceNode.prototype;
    const started = new WeakSet<AudioBufferSourceNode>();
    AudioBufferSourceNode.prototype.start = function (...args) {
      if (this.loop) {
        started.add(this);
        state.playing++;
      }
      return start.apply(this, args);
    };
    AudioBufferSourceNode.prototype.stop = function (...args) {
      // 引数なしの stop（今すぐ止める）だけを、止めたとみなす
      if (started.has(this) && args.length === 0) {
        started.delete(this);
        state.playing--;
      }
      return stop.apply(this, args);
    };
  });
}

function loopingSources(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      (window as unknown as { __loopingSources: { playing: number } })
        .__loopingSources.playing,
  );
}

async function setPageVisible(page: Page, visible: boolean) {
  await page.evaluate((isVisible) => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => (isVisible ? "visible" : "hidden"),
    });
    document.dispatchEvent(new Event("visibilitychange"));
  }, visible);
}

test("環境音・BGM はプレイ中だけ流れ、タブが裏に回ると止まり、結果画面ではフェードして止まる", async ({
  page,
}) => {
  await recordLoopingSources(page);
  await page.clock.install();
  await page.goto("/");

  // 券売機・トッピングでは流さない
  await page.getByRole("button", { name: /^並/ }).click();
  await expect(
    page.getByRole("button", { name: "いただきます" }),
  ).toBeVisible();
  expect(await loopingSources(page)).toBe(0);

  // 「いただきます」のあと、スペースで始めるまでは流さない
  await page.getByRole("button", { name: "いただきます" }).click();
  await expect(page.getByText("スペース か Enter で始める")).toBeVisible();
  expect(await loopingSources(page)).toBe(0);
  await page.keyboard.press(" ");
  await expect(page.getByTestId("remaining-romaji")).not.toBeEmpty();
  await expect.poll(() => loopingSources(page)).toBe(1);

  // タブが裏に回ったら止め、戻ったら再開する（止めるのはフェードのあと）
  await setPageVisible(page, false);
  await page.clock.runFor(1000);
  await expect.poll(() => loopingSources(page)).toBe(0);
  await setPageVisible(page, true);
  await expect.poll(() => loopingSources(page)).toBe(1);

  // 閉店して結果画面に移ったら、フェードしてから止める
  await page.clock.runFor(61_000);
  await expect(page.getByRole("heading", { name: "御会計" })).toBeVisible();
  await page.clock.runFor(1000);
  await expect.poll(() => loopingSources(page)).toBe(0);
});

test("環境音・BGM の札は効果音とは別に切り替えられ、キーボードでも押せて、再読み込みしても設定が残る", async ({
  page,
}) => {
  await recordLoopingSources(page);
  await page.clock.install();
  await page.goto("/");

  const ambience = page.getByRole("button", { name: /^環境音・BGM/ });
  const sound = page.getByRole("button", { name: /^効果音/ });
  // 既定はオン
  await expect(ambience).toHaveAttribute("aria-pressed", "true");
  await expect(ambience).toHaveText("環境音・BGM: オン");

  // キーボードで押してオフにする。効果音の札は変わらない
  await ambience.focus();
  await page.keyboard.press("Enter");
  await expect(ambience).toHaveAttribute("aria-pressed", "false");
  await expect(ambience).toHaveText("環境音・BGM: オフ");
  await expect(sound).toHaveAttribute("aria-pressed", "true");

  // 再読み込みしてもオフのまま
  await page.reload();
  await expect(ambience).toHaveAttribute("aria-pressed", "false");

  // オフのまま遊んでも流れない。プレイ中にオンにすると流れ、オフにすると止まる
  await page.getByRole("button", { name: /^並/ }).click();
  await page.getByRole("button", { name: "いただきます" }).click();
  await page.keyboard.press(" ");
  await expect(page.getByTestId("remaining-romaji")).not.toBeEmpty();
  expect(await loopingSources(page)).toBe(0);
  await ambience.click();
  await expect.poll(() => loopingSources(page)).toBe(1);
  await ambience.click();
  await page.clock.runFor(1000);
  await expect.poll(() => loopingSources(page)).toBe(0);
});
