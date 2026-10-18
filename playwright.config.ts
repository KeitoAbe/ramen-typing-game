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
    // シェルに NODE_ENV=development が残っていると、本番ビルドのプリレンダリングが落ちる
    env: { NODE_ENV: "production" },
    // 別のサーバー（開発サーバーや古いビルド）を検証してしまわないよう、ポートが使われていたら失敗させる
    reuseExistingServer: false,
    timeout: 300_000,
  },
});
