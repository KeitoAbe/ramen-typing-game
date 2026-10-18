import { test as base } from "@playwright/test";

export { expect, type Page } from "@playwright/test";

// E2E のビルドには広告の ID（ダミー）を渡して広告枠を出す（playwright.config.ts）。
// 本物のアドセンスには問い合わせないよう、スクリプトは空のものに差し替える
export const test = base.extend<{ stubAdsense: undefined }>({
  stubAdsense: [
    async ({ page }, use) => {
      await page.route(
        /^https:\/\/pagead2\.googlesyndication\.com\//,
        (route) => route.fulfill({ contentType: "text/javascript", body: "" }),
      );
      await use(undefined);
    },
    { auto: true },
  ],
});
