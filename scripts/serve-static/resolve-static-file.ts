import { basename, extname, isAbsolute, posix, relative } from "node:path";

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
 * 拡張子の無いファイルとして出力される画像のルート。
 * Cloudflare Pages では public/_headers で同じ Content-Type を付けている
 */
const EXTENSIONLESS_CONTENT_TYPES: Record<string, string> = {
  "opengraph-image": "image/png",
  "twitter-image": "image/png",
  "apple-icon": "image/png",
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
  // Windows では `\` も区切り文字として扱われ、`..` の検査をすり抜けるので拒否する
  if (
    !decoded.startsWith("/") ||
    decoded.includes("\\") ||
    decoded.split("/").includes("..")
  ) {
    return [];
  }
  const path = posix.normalize(decoded).slice(1);
  if (path === "") return ["index.html"];
  if (path.endsWith("/")) {
    return [`${path}index.html`, `${path.slice(0, -1)}.html`];
  }
  return [path, `${path}.html`, `${path}/index.html`];
}

/** 解決したファイルのパスが、出力ディレクトリの中にあるか */
export function isInsideRoot(root: string, file: string): boolean {
  const path = relative(root, file);
  return path !== "" && !path.startsWith("..") && !isAbsolute(path);
}

/** ファイルの拡張子から Content-Type を決める。わからないときはバイナリとして返す */
export function contentTypeOf(file: string): string {
  const extension = extname(file);
  const contentType =
    extension === ""
      ? EXTENSIONLESS_CONTENT_TYPES[basename(file)]
      : CONTENT_TYPES[extension];
  return contentType ?? "application/octet-stream";
}
