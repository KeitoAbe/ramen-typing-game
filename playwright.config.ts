import { defineConfig, devices } from "@playwright/test";

// 開発サーバー（3000 番）と取り合わないよう、E2E は別のポートで本番ビルドを立てる
const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // 不安定なテストを再試行で隠さない。落ちたら原因を直す
  retries: 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    // シェルに NODE_ENV=development が残っていると、本番ビルドのプリレンダリングが落ちる。
    // 広告枠の配置を確かめるため、ダミーの広告の ID を渡す（スクリプトは e2e/fixtures.ts で差し替える）。
    // お問い合わせのリンクを確かめるため、架空のメールアドレスを渡す
    env: {
      NODE_ENV: "production",
      NEXT_PUBLIC_CONTACT_EMAIL: "contact@example.com",
      NEXT_PUBLIC_ADSENSE_PUBLISHER_ID: "ca-pub-0000000000000000",
      NEXT_PUBLIC_ADSENSE_SLOT_ID: "1111111111",
      NEXT_PUBLIC_ADSENSE_STAGE_BOTTOM_SLOT_ID: "2222222222",
      NEXT_PUBLIC_ADSENSE_STAGE_SIDE_SLOT_ID: "3333333333",
    },
    // 別のサーバー（開発サーバーや古いビルド）を検証してしまわないよう、ポートが使われていたら失敗させる
    reuseExistingServer: false,
    timeout: 300_000,
  },
});
