// ページの head と OGP 画像で同じ文言を使う
export const SITE_NAME = "ラーメン屋台タイピング";

export const SITE_TITLE = `${SITE_NAME} - 注文をローマ字で打って、ラーメンを平らげよう`;

export const SITE_DESCRIPTION =
  "夜のラーメン屋台で、注文をローマ字で打ってラーメンを平らげるタイピングゲーム。麺がのびる前に次々と食べきって、お会計を積み上げよう。";

/** トップページ以外のページの title。「ページ名 | サイト名」にする */
export function pageTitle(pageName: string): string {
  return `${pageName} | ${SITE_NAME}`;
}

export const OG_IMAGE_ALT =
  "夜のラーメン屋台に「ラーメン屋台タイピング」の看板が掛かった、ゲームの紹介画像";
