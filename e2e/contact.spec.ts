import { expect, test } from "@e2e/fixtures";

// お問い合わせのメールアドレスは、サーバーから返る HTML には平文で載せず、ブラウザで表示する

const EMAIL = "contact@example.com";

test("サーバーから返る HTML には、メールアドレスがそのまま含まれていない", async ({
  request,
}) => {
  const response = await request.get("/contact");
  expect(response.ok()).toBe(true);
  expect(await response.text()).not.toContain(EMAIL);
});

test("ブラウザで開くと、宛先と件名が入ったメールのリンクが出る", async ({
  page,
}) => {
  await page.goto("/contact");
  const link = page.getByRole("link", { name: EMAIL });
  await expect(link).toBeVisible();
  const href = await link.getAttribute("href");
  expect(href).toBe(
    `mailto:${EMAIL}?subject=${encodeURIComponent("ラーメン屋台タイピングへのお問い合わせ")}`,
  );
});

test("運営者情報・プライバシーポリシー・フッターから、お問い合わせのページへ行ける", async ({
  page,
}) => {
  for (const path of ["/about", "/privacy"]) {
    await page.goto(path);
    await page
      .getByRole("main")
      .getByRole("link", { name: "お問い合わせ" })
      .first()
      .click();
    await expect(page).toHaveURL(/\/contact$/);
  }
  await page.goto("/");
  await page
    .getByRole("contentinfo")
    .getByRole("link", { name: "お問い合わせ" })
    .click();
  await expect(page).toHaveURL(/\/contact$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "お問い合わせ",
  );
});
