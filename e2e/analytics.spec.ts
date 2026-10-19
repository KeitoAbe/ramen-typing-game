import { expect, type Page, test } from "@e2e/fixtures";

// GA4 に送るカスタムイベントが、それぞれの出来事のときに 1 回ずつ送られることを確かめる。
// E2E のビルドには測定 ID を渡していないので GA4 のタグは読み込まれない。
// 代わりに、送られたイベントを記録する gtag を置く。ページを移っても読めるよう、記録は sessionStorage に残す

type GaEvent = [name: string, params: Record<string, unknown>];

const EVENTS_KEY = "e2e:ga-events";

test.beforeEach(async ({ page }) => {
  await page.addInitScript((key) => {
    window.gtag = (_command, name, params) => {
      const events = JSON.parse(sessionStorage.getItem(key) ?? "[]");
      events.push([name, params]);
      sessionStorage.setItem(key, JSON.stringify(events));
    };
    // 共有の X の投稿画面は開かない
    window.open = () => null;
  }, EVENTS_KEY);
});

async function gaEvents(page: Page): Promise<GaEvent[]> {
  return page.evaluate(
    (key) => JSON.parse(sessionStorage.getItem(key) ?? "[]"),
    EVENTS_KEY,
  );
}

async function eventsNamed(page: Page, name: string) {
  return (await gaEvents(page)).filter(([eventName]) => eventName === name);
}

/** IME がオンのまま押されたキー（keyCode 229）を送る */
async function pressImeKey(page: Page) {
  await page.evaluate(() => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Process", keyCode: 229 }),
    );
  });
}

test("1 プレイの流れで、開始・案内・効果音・終了・共有・もう一杯のイベントが 1 回ずつ送られる", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");

  await page.getByRole("button", { name: /^並/ }).click();
  await page.getByRole("checkbox", { name: /激辛/ }).check();
  await page.getByRole("button", { name: "いただきます" }).click();
  // 「いただきます」を押しただけでは始まっていないので、play_start はまだ送らない
  await expect(page.getByText("スペース か Enter で始める")).toBeVisible();
  expect(await eventsNamed(page, "play_start")).toEqual([]);
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("remaining-romaji")).not.toBeEmpty();

  // IME がオンのまま 2 回打っても、案内の計測は 1 回だけ
  await pressImeKey(page);
  await pressImeKey(page);
  await expect(
    page.getByText("半角英数（IME オフ）に切り替えて打ってください"),
  ).toBeVisible();

  await page.getByRole("button", { name: /効果音/ }).click();

  await page.clock.runFor(61_000);
  await expect(page.getByRole("heading", { name: "御会計" })).toBeVisible();

  await page.getByRole("button", { name: /X で共有/ }).click();
  await page.getByRole("button", { name: "もう一杯" }).click();
  await expect(page.getByRole("button", { name: /^並/ })).toBeVisible();

  const events = await gaEvents(page);
  expect(events.map(([name]) => name)).toEqual([
    "play_start",
    "ime_notice_shown",
    "sound_toggle",
    "play_end",
    "share",
    "replay",
  ]);
  const params = Object.fromEntries(events);
  expect(params.play_start).toEqual({
    course_id: "nami",
    course_name: "並",
    toppings: "gekikara",
  });
  expect(params.ime_notice_shown).toEqual({ course_id: "nami" });
  expect(params.sound_toggle).toEqual({ enabled: false });
  expect(params.play_end).toEqual({
    course_id: "nami",
    course_name: "並",
    toppings: "gekikara",
    bill: 0,
    balance: -3000,
    served_count: 0,
    discarded_count: expect.any(Number),
    miss_count: 0,
    accuracy: 0,
    keys_per_second: 0,
    max_streak: 0,
    kaedama_count: 0,
    title_id: expect.any(String),
    is_personal_best: true,
  });
  expect(params.share).toEqual({
    method: "x",
    content_type: "result",
    item_id: "nami",
  });
  expect(params.replay).toEqual({ course_id: "nami" });
});

test("ime_notice_shown は、開始待ちとプレイ中の両方で案内が出ても 1 プレイに 1 回だけ送られ、次のプレイではもう 1 回送られる", async ({
  page,
}) => {
  const imeNotice = page.getByText("日本語入力がオンになっています");
  await page.clock.install();
  await page.goto("/");

  await page.getByRole("button", { name: /^並/ }).click();
  await page.getByRole("button", { name: "いただきます" }).click();
  await expect(page.getByText("スペース か Enter で始める")).toBeVisible();

  // 開始待ちで案内を出す
  await pressImeKey(page);
  await expect(imeNotice).toBeVisible();
  // 計測は描画のあとの effect で送られるので、記録されるまで待つ
  await expect
    .poll(async () => (await eventsNamed(page, "ime_notice_shown")).length)
    .toBe(1);

  // そのまま始めて、プレイ中にも案内を出す
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("remaining-romaji")).not.toBeEmpty();
  await pressImeKey(page);
  await expect(
    page.getByText("半角英数（IME オフ）に切り替えて打ってください"),
  ).toBeVisible();
  expect(await eventsNamed(page, "ime_notice_shown")).toHaveLength(1);

  await page.clock.runFor(61_000);
  await expect(page.getByRole("heading", { name: "御会計" })).toBeVisible();

  // 「もう一杯」から次のプレイで、再び案内を出す
  await page.getByRole("button", { name: "もう一杯" }).click();
  await page.getByRole("button", { name: /^並/ }).click();
  await page.getByRole("button", { name: "いただきます" }).click();
  await expect(page.getByText("スペース か Enter で始める")).toBeVisible();
  await pressImeKey(page);
  await expect(imeNotice).toBeVisible();

  await expect
    .poll(() => eventsNamed(page, "ime_notice_shown"))
    .toEqual([
      ["ime_notice_shown", { course_id: "nami" }],
      ["ime_notice_shown", { course_id: "nami" }],
    ]);
});

test("食券を買ってから、ほかのページに移ると ticket_abandon が 1 回送られる", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^並/ }).click();
  await expect(
    page.getByRole("button", { name: "いただきます" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "プライバシーポリシー" }).click();
  await expect(page).toHaveURL(/\/privacy$/);

  expect(await eventsNamed(page, "ticket_abandon")).toEqual([
    ["ticket_abandon", { course_id: "nami", transport_type: "beacon" }],
  ]);
});

test("食券を買ってから、ページを離れると ticket_abandon が 1 回送られる", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^並/ }).click();
  await expect(
    page.getByRole("button", { name: "いただきます" }),
  ).toBeVisible();

  // アプリの外への移動と同じく、ページが閉じられる（pagehide が起きる）
  await page.goto("/about");

  expect(await eventsNamed(page, "ticket_abandon")).toEqual([
    ["ticket_abandon", { course_id: "nami", transport_type: "beacon" }],
  ]);
});

test("「いただきます」のあと、始める前にページを離れると ticket_abandon が 1 回送られ、play_start は送らない", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^並/ }).click();
  await page.getByRole("button", { name: "いただきます" }).click();
  await expect(page.getByText("スペース か Enter で始める")).toBeVisible();

  await page.goto("/about");

  expect(await eventsNamed(page, "ticket_abandon")).toEqual([
    ["ticket_abandon", { course_id: "nami", transport_type: "beacon" }],
  ]);
  expect(await eventsNamed(page, "play_start")).toEqual([]);
});

test("プレイを始めたあとにページを離れても、ticket_abandon は送らない", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^並/ }).click();
  await page.getByRole("button", { name: "いただきます" }).click();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("remaining-romaji")).not.toBeEmpty();

  await page.goto("/about");

  expect(await eventsNamed(page, "ticket_abandon")).toEqual([]);
  expect(await eventsNamed(page, "touch_notice_shown")).toEqual([]);
});

test.describe("タッチ端末", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  test("案内が出たら touch_notice_shown が 1 回送られる", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByText("PC のキーボードで遊んでください"),
    ).toBeVisible();

    expect(await eventsNamed(page, "touch_notice_shown")).toEqual([
      ["touch_notice_shown", {}],
    ]);
  });
});
