import { expect, test } from "@e2e/fixtures";

// static export の出力を、拡張子なしの URL や 404 のページも含めて配信できることを確かめる

test("各ページを拡張子なしの URL で開ける", async ({ request }) => {
  for (const path of ["/", "/privacy", "/about", "/contact"]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    expect(response.headers()["content-type"], path).toContain("text/html");
  }
});

test("存在しないパスを開くと、サイトの 404 のページが出る", async ({
  page,
}) => {
  const response = await page.goto("/no-such-page");
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { level: 1, name: "404" }),
  ).toBeVisible();
});

test("sitemap.xml・robots.txt・ads.txt・OGP 画像・アイコンが出力されている", async ({
  request,
}) => {
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain("/privacy</loc>");

  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain("Sitemap:");

  // E2E のビルドにはダミーのパブリッシャー ID を渡している（playwright.config.ts）
  const adsTxt = await request.get("/ads.txt");
  expect(adsTxt.status()).toBe(200);
  expect(await adsTxt.text()).toBe(
    "google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0\n",
  );

  for (const [path, contentType] of [
    ["/opengraph-image", "image/png"],
    ["/twitter-image", "image/png"],
    ["/apple-icon", "image/png"],
    ["/icon.svg", "image/svg+xml"],
  ]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    expect(response.headers()["content-type"], path).toBe(contentType);
    expect((await response.body()).length, path).toBeGreaterThan(0);
  }
});
