import robots from "@/app/robots";
import {
  buildGameJsonLd,
  getSiteUrl,
  parseSiteUrl,
  serializeJsonLd,
} from "@/app/site-url";
import sitemap from "@/app/sitemap";

const original = process.env.NEXT_PUBLIC_SITE_URL;
afterEach(() => {
  if (original === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = original;
});

describe("parseSiteUrl", () => {
  it("末尾のスラッシュを取り除く", () => {
    expect(parseSiteUrl(" https://example.com/ ")).toBe("https://example.com");
    expect(parseSiteUrl("https://example.com/typing/")).toBe(
      "https://example.com/typing",
    );
  });

  it("未設定・URL でない値・http(s) でない値は null", () => {
    expect(parseSiteUrl(undefined)).toBeNull();
    expect(parseSiteUrl("")).toBeNull();
    expect(parseSiteUrl("example.com")).toBeNull();
    expect(parseSiteUrl("javascript:alert(1)")).toBeNull();
  });
});

describe("getSiteUrl", () => {
  it("環境変数の値を使う", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com/";
    expect(getSiteUrl()).toBe("https://example.com");
  });

  it("環境変数が無いときは localhost を使う", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(getSiteUrl()).toBe("http://localhost:3000");
  });
});

describe("/sitemap.xml", () => {
  it("公開しているページをすべて、サイトの URL で載せる", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com";
    expect(sitemap().map((entry) => entry.url)).toEqual([
      "https://example.com/",
      "https://example.com/privacy",
      "https://example.com/about",
      "https://example.com/contact",
    ]);
  });
});

describe("/robots.txt", () => {
  it("すべてのページのクロールを許可し、サイトマップの場所を示す", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com";
    expect(robots()).toEqual({
      rules: { userAgent: "*", allow: "/" },
      sitemap: "https://example.com/sitemap.xml",
    });
  });
});

describe("トップページの構造化データ", () => {
  it("名前・説明・URL・ジャンル・言語・無料であることを持つゲーム", () => {
    const jsonLd = buildGameJsonLd("https://example.com");
    expect(jsonLd).toMatchObject({
      "@context": "https://schema.org",
      "@type": "VideoGame",
      name: "ラーメン屋台タイピング",
      description: expect.stringContaining("タイピングゲーム"),
      url: "https://example.com/",
      genre: "タイピングゲーム",
      inLanguage: "ja",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: 0, priceCurrency: "JPY" },
    });
  });

  it("script タグを閉じられないよう、`<` を逃がして文字列にする", () => {
    const serialized = serializeJsonLd({ name: "</script><b>" });
    expect(serialized).not.toContain("<");
    expect(JSON.parse(serialized)).toEqual({ name: "</script><b>" });
  });
});
