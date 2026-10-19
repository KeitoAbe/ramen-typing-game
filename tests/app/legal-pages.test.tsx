import { renderToStaticMarkup } from "react-dom/server";
import AboutPage, { metadata as aboutMetadata } from "@/app/about/page";
import ContactPage, { metadata as contactMetadata } from "@/app/contact/page";
import PrivacyPage, { metadata as privacyMetadata } from "@/app/privacy/page";
import { CONTRIBUTING_URL, REPOSITORY_URL } from "@/client/lib/repository";

function h1Of(html: string): string {
  expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
  return html.match(/<h1[^>]*>(.*?)<\/h1>/)?.[1] ?? "";
}

describe.each([
  ["プライバシーポリシー", PrivacyPage, privacyMetadata, "/privacy"],
  ["運営者情報", AboutPage, aboutMetadata, "/about"],
  ["お問い合わせ", ContactPage, contactMetadata, "/contact"],
])("%s のページ", (name, Page, metadata, path) => {
  const html = renderToStaticMarkup(<Page />);

  it("自分のパスを正規 URL にしている", () => {
    expect(metadata.alternates?.canonical).toBe(path);
  });

  it("h1 と、ページ名を含む title・description がある", () => {
    expect(h1Of(html)).toBe(name);
    expect(metadata.title).toBe(`${name} | ラーメン屋台タイピング`);
    expect(metadata.description).toEqual(expect.any(String));
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
