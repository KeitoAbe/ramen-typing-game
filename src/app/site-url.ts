import { SITE_DESCRIPTION, SITE_NAME } from "@/app/site-metadata";

/** 環境変数が無いとき（ローカルの開発など）に使う URL */
const FALLBACK_SITE_URL = "http://localhost:3000";

/** 検索エンジンに公開しているページのパス。サイトマップに載せる */
export const PUBLIC_PAGE_PATHS = ["/", "/privacy", "/about", "/contact"];

/**
 * サイトの URL（`https://example.com`）を、環境変数の値から取り出す。
 * 末尾のスラッシュは取り除く。未設定・http(s) でない値・パスを含む値のときは null
 * （basePath を設定していないので、サブパスを受け入れるとサイトマップなどの URL が 404 になる）
 */
export function parseSiteUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.pathname !== "/") return null;
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * サイトの URL。メタデータの基準 URL・サイトマップ・robots.txt・構造化データで共通に使う。
 * NEXT_PUBLIC_ の変数はビルド時に値が埋め込まれる（static export で静的ファイルとして配信するため）
 */
export function getSiteUrl(): string {
  return parseSiteUrl(process.env.NEXT_PUBLIC_SITE_URL) ?? FALLBACK_SITE_URL;
}

/** サイトの URL にパスをつないで、絶対 URL にする */
export function absoluteUrl(siteUrl: string, path: string): string {
  return path === "/" ? `${siteUrl}/` : `${siteUrl}${path}`;
}

/** トップページに載せる、ゲームであることを示す構造化データ（JSON-LD） */
export function buildGameJsonLd(siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: absoluteUrl(siteUrl, "/"),
    genre: "タイピングゲーム",
    inLanguage: "ja",
    applicationCategory: "GameApplication",
    gamePlatform: "Web ブラウザ",
    isAccessibleForFree: true,
    offers: {
      "@type": "Offer",
      price: 0,
      priceCurrency: "JPY",
    },
  };
}

/** JSON-LD を script タグに埋め込める文字列にする。`<` を逃がして、タグを閉じられないようにする */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
