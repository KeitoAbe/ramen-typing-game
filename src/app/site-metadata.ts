import type { Metadata, ResolvingMetadata } from "next";

// ページの head と OGP 画像で同じ文言を使う
export const SITE_NAME = "ラーメン屋台タイピング";

export const SITE_TITLE = `${SITE_NAME} - 注文をローマ字で打って、ラーメンを平らげよう`;

export const SITE_DESCRIPTION =
  "夜のラーメン屋台で、注文をローマ字で打ってラーメンを平らげるタイピングゲーム。麺がのびる前に次々と食べきって、お会計を積み上げよう。";

/** トップページ以外のページの title。「ページ名 | サイト名」にする */
export function pageTitle(pageName: string): string {
  return `${pageName} | ${SITE_NAME}`;
}

/** どのページでも同じ値にする OGP の項目 */
export const SHARED_OPEN_GRAPH = {
  type: "website",
  siteName: SITE_NAME,
  locale: "ja_JP",
} as const;

export const TWITTER_CARD = "summary_large_image";

/**
 * ページの title・description・正規 URL と、共有用の OGP・Twitter カードを揃えて作る。
 * 子のページで openGraph・twitter を指定すると親の値は項目ごと置き換わり、
 * ルートの opengraph-image.tsx / twitter-image.tsx から入る画像も消えるので、
 * 共通の項目と、親で解決済みの画像を入れ直す
 */
export async function pageMetadata(
  {
    title,
    description,
    path,
  }: {
    title: string;
    description: string;
    path: string;
  },
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { openGraph, twitter } = await parent;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      ...SHARED_OPEN_GRAPH,
      title,
      description,
      url: path,
      ...(openGraph?.images && { images: openGraph.images }),
    },
    twitter: {
      card: TWITTER_CARD,
      title,
      description,
      ...(twitter?.images && { images: twitter.images }),
    },
  };
}

export const OG_IMAGE_ALT =
  "夜のラーメン屋台に「ラーメン屋台タイピング」の看板が掛かった、ゲームの紹介画像";
