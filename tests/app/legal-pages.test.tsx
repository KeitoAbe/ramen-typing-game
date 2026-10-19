import type { ResolvedMetadata } from "next";
import { renderToStaticMarkup } from "react-dom/server";
import AboutPage, {
  generateMetadata as generateAboutMetadata,
} from "@/app/about/page";
import ContactPage, {
  generateMetadata as generateContactMetadata,
} from "@/app/contact/page";
import PrivacyPage, {
  generateMetadata as generatePrivacyMetadata,
} from "@/app/privacy/page";
import { CONTRIBUTING_URL, REPOSITORY_URL } from "@/client/lib/repository";

// ルートで解決済みの OGP 画像（opengraph-image.tsx / twitter-image.tsx から入るもの）の代わり
const OG_IMAGES = [{ url: "https://example.com/opengraph-image?abc" }];
const TWITTER_IMAGES = [{ url: "https://example.com/twitter-image?def" }];

function resolveMetadata(generate: typeof generateAboutMetadata) {
  const parent = Promise.resolve({
    openGraph: { images: OG_IMAGES },
    twitter: { images: TWITTER_IMAGES },
  } as unknown as ResolvedMetadata);
  return generate({}, parent);
}

function h1Of(html: string): string {
  expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
  return html.match(/<h1[^>]*>(.*?)<\/h1>/)?.[1] ?? "";
}

describe.each([
  ["プライバシーポリシー", PrivacyPage, generatePrivacyMetadata, "/privacy"],
  ["運営者情報", AboutPage, generateAboutMetadata, "/about"],
  ["お問い合わせ", ContactPage, generateContactMetadata, "/contact"],
])("%s のページ", (name, Page, generateMetadata, path) => {
  const html = renderToStaticMarkup(<Page />);

  it("自分のパスを正規 URL と og:url にしている", async () => {
    const metadata = await resolveMetadata(generateMetadata);
    expect(metadata.alternates?.canonical).toBe(path);
    expect(metadata.openGraph?.url).toBe(path);
  });

  it("h1 と、ページ名を含む title・description がある", async () => {
    const metadata = await resolveMetadata(generateMetadata);
    expect(h1Of(html)).toBe(name);
    expect(metadata.title).toBe(`${name} | ラーメン屋台タイピング`);
    expect(metadata.description).toEqual(expect.any(String));
  });

  it("OGP と Twitter カードの title・description が、ページの title・description と同じ", async () => {
    const metadata = await resolveMetadata(generateMetadata);
    expect(metadata.openGraph).toMatchObject({
      title: metadata.title,
      description: metadata.description,
    });
    expect(metadata.twitter).toMatchObject({
      title: metadata.title,
      description: metadata.description,
    });
  });

  it("サイト共通の OGP の項目と、ルートの OGP 画像を引き継ぐ", async () => {
    const metadata = await resolveMetadata(generateMetadata);
    expect(metadata.openGraph).toMatchObject({
      siteName: "ラーメン屋台タイピング",
      locale: "ja_JP",
      type: "website",
      images: OG_IMAGES,
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      images: TWITTER_IMAGES,
    });
  });

  it("トップページと同じヘッダーとフッター、トップページへ戻るリンクがある", () => {
    expect(html).toContain('href="/"');
    expect(html).toContain("<header");
    expect(html).toContain("noren-fringe");
    expect(html).toContain("<footer");
  });
});

describe("プライバシーポリシーのページ", () => {
  const html = renderToStaticMarkup(<PrivacyPage />);

  it("localStorage に保存し、サーバーには送らないことが書かれている", () => {
    expect(html).toContain("localStorage");
    expect(html).toContain("サーバーには送りません");
  });

  it("Google アナリティクスと Cookie、オプトアウトの方法が書かれている", () => {
    expect(html).toContain("アナリティクス");
    expect(html).toContain("Cookie");
    expect(html).toContain("https://tools.google.com/dlpage/gaoptout?hl=ja");
  });

  it("Google アドセンスと第三者配信、広告設定へのリンクが書かれている", () => {
    expect(html).toContain("アドセンス");
    expect(html).toContain("第三者配信事業者");
    expect(html).toContain("https://adssettings.google.com/");
  });

  it("免責事項、ポリシーの変更、制定日が書かれている", () => {
    expect(html).toContain(">免責事項</h2>");
    expect(html).toContain(">プライバシーポリシーの変更</h2>");
    expect(html).toContain("制定日");
  });
});

describe("運営者情報のページ", () => {
  it("運営者名と、個人で運営していることが書かれている", () => {
    const html = renderToStaticMarkup(<AboutPage />);
    expect(html).toContain("阿部 圭杜");
    expect(html).toContain("個人で開発・運営しています");
  });

  it("開発への参加の仕方と、取り込み・収益の方針が書かれている", () => {
    const html = renderToStaticMarkup(<AboutPage />);
    expect(html).toContain(">開発に参加する</h2>");
    expect(html).toContain("不具合の報告（Issue）や改善の提案（PR）");
    expect(html).toContain("取り込むかどうかは、運営者が判断します");
    expect(html).toContain("広告収益は運営者に帰属します");
    expect(html).toContain("収益の分配はありません");
    expect(html).toContain(`href="${CONTRIBUTING_URL}"`);
    expect(html).toContain(`href="${REPOSITORY_URL}"`);
  });
});

describe("お問い合わせのページ", () => {
  const original = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_CONTACT_EMAIL;
    else process.env.NEXT_PUBLIC_CONTACT_EMAIL = original;
  });

  it("メールで受け付けることと、返信に時間がかかる場合があることが書かれている", () => {
    const html = renderToStaticMarkup(<ContactPage />);
    expect(html).toContain("メールでお送りください");
    expect(html).toContain("お返事にお時間をいただく");
  });

  it("メールアドレスがあるときは、HTML にアドレスを平文で載せずに、メールの手段を出す", () => {
    process.env.NEXT_PUBLIC_CONTACT_EMAIL = "contact@example.com";
    const html = renderToStaticMarkup(<ContactPage />);
    expect(html).not.toContain("contact@example.com");
    expect(html).not.toContain("mailto:");
    expect(html).toContain("メールアドレスを表示しています");
    expect(html).not.toContain("準備中");
  });

  it("メールアドレスが無いときは、手段を出さずに「準備中」と出す", () => {
    delete process.env.NEXT_PUBLIC_CONTACT_EMAIL;
    const html = renderToStaticMarkup(<ContactPage />);
    expect(html).toContain("準備中");
    expect(html).not.toContain("メールアドレスを表示しています");
  });

  it("メールアドレスの形でないときは、手段を出さずに「準備中」と出す", () => {
    process.env.NEXT_PUBLIC_CONTACT_EMAIL = "not-an-email";
    const html = renderToStaticMarkup(<ContactPage />);
    expect(html).toContain("準備中");
    expect(html).not.toContain("not-an-email");
    expect(html).not.toContain("メールアドレスを表示しています");
  });
});
