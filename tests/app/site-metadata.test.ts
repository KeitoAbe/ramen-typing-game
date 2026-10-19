import type { ResolvedMetadata, ResolvingMetadata } from "next";
import {
  pageMetadata,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
} from "@/app/site-metadata";

const OG_IMAGES = [{ url: "https://example.com/opengraph-image?abc" }];
const TWITTER_IMAGES = [{ url: "https://example.com/twitter-image?def" }];

function parentWith(metadata: Partial<ResolvedMetadata>): ResolvingMetadata {
  return Promise.resolve(metadata as ResolvedMetadata);
}

describe("pageMetadata", () => {
  const page = {
    title: "運営者情報 | ラーメン屋台タイピング",
    description: "運営者情報です。",
    path: "/about",
  };

  it("title・description・正規 URL を、そのページの値にする", async () => {
    const metadata = await pageMetadata(page, parentWith({}));
    expect(metadata.title).toBe(page.title);
    expect(metadata.description).toBe(page.description);
    expect(metadata.alternates?.canonical).toBe(page.path);
  });

  it("OGP と Twitter カードの title・description を、そのページの値にし、og:url を正規 URL と同じパスにする", async () => {
    const metadata = await pageMetadata(page, parentWith({}));
    expect(metadata.openGraph).toMatchObject({
      title: page.title,
      description: page.description,
      url: page.path,
    });
    expect(metadata.twitter).toMatchObject({
      title: page.title,
      description: page.description,
    });
  });

  it("サイト名・言語・種類・カードの形は、どのページでも同じ値を入れる", async () => {
    const metadata = await pageMetadata(page, parentWith({}));
    expect(metadata.openGraph).toMatchObject({
      siteName: SITE_NAME,
      locale: "ja_JP",
      type: "website",
    });
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
  });

  it("親で解決済みの OGP 画像と Twitter 画像を引き継ぐ", async () => {
    const metadata = await pageMetadata(
      page,
      parentWith({
        openGraph: { images: OG_IMAGES } as ResolvedMetadata["openGraph"],
        twitter: { images: TWITTER_IMAGES } as ResolvedMetadata["twitter"],
      }),
    );
    expect(metadata.openGraph?.images).toEqual(OG_IMAGES);
    expect(metadata.twitter?.images).toEqual(TWITTER_IMAGES);
  });

  it("親に画像が無いときは images を指定しない（画像ファイルの自動の設定を妨げない）", async () => {
    const metadata = await pageMetadata(page, parentWith({}));
    expect(metadata.openGraph).not.toHaveProperty("images");
    expect(metadata.twitter).not.toHaveProperty("images");
  });

  it("トップページでは、サイト全体の title・description を共有用にも使う", async () => {
    const metadata = await pageMetadata(
      { title: SITE_TITLE, description: SITE_DESCRIPTION, path: "/" },
      parentWith({}),
    );
    expect(metadata.openGraph).toMatchObject({
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      url: "/",
    });
    expect(metadata.twitter).toMatchObject({
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
    });
  });
});
