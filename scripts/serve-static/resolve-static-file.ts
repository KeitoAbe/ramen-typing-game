import { extname, posix } from "node:path";

/** 存在しないパスのときに返す、サイトの 404 のページ */
export const NOT_FOUND_FILE = "404.html";

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

/**
 * URL のパスに対して、配信するファイルの候補（出力ディレクトリからの相対パス）を、探す順に返す。
 * Cloudflare Pages と同じく、拡張子なしの URL（`/about`）で `about.html` を返せるようにする。
 * 出力ディレクトリの外を指すパスや、読めないパスのときは空の配列
 */
export function staticFileCandidates(pathname: string): string[] {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return [];
  }
  if (!decoded.startsWith("/") || decoded.split("/").includes("..")) {
    return [];
  }
  const path = posix.normalize(decoded).slice(1);
  if (path === "") return ["index.html"];
  if (path.endsWith("/")) {
    return [`${path}index.html`, `${path.slice(0, -1)}.html`];
  }
  return [path, `${path}.html`, `${path}/index.html`];
}

/** ファイルの拡張子から Content-Type を決める。わからないときはバイナリとして返す */
export function contentTypeOf(file: string): string {
  return CONTENT_TYPES[extname(file)] ?? "application/octet-stream";
}
