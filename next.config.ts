import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // サーバーで動く処理が無いので、静的ファイル一式（out/）を出力して Cloudflare Pages で配信する
  // cacheComponents（と、それに依存する partialPrefetching）は使わない。
  // cacheComponents を有効にすると Route Handler（ads.txt）に `dynamic = "force-static"` を書けず、
  // static export が求める「静的だと明示する」ことができないため
  output: "export",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
