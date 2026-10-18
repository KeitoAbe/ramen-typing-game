import { renderToStaticMarkup } from "react-dom/server";
import AboutPage, { metadata as aboutMetadata } from "@/app/about/page";
import ContactPage, { metadata as contactMetadata } from "@/app/contact/page";
import PrivacyPage, { metadata as privacyMetadata } from "@/app/privacy/page";

function h1Of(html: string): string {
  expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
  return html.match(/<h1[^>]*>(.*?)<\/h1>/)?.[1] ?? "";
}

describe.each([
  ["プライバシーポリシー", PrivacyPage, privacyMetadata],
  ["運営者情報", AboutPage, aboutMetadata],
  ["お問い合わせ", ContactPage, contactMetadata],
])("%s のページ", (name, Page, metadata) => {
  const html = renderToStaticMarkup(<Page />);

  it("h1 と、ページ名を含む title・description がある", () => {
    expect(h1Of(html)).toBe(name);
    expect(metadata.title).toBe(`${name} | ラーメン屋台タイピング`);
    expect(metadata.description).toEqual(expect.any(String));
  });

  it("トップページへ戻るリンクとフッターがある", () => {
    expect(html).toContain('href="/"');
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
});

describe("お問い合わせのページ", () => {
  const original = process.env.NEXT_PUBLIC_CONTACT_FORM_URL;
  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_CONTACT_FORM_URL;
    else process.env.NEXT_PUBLIC_CONTACT_FORM_URL = original;
  });

  it("フォームの URL があるときは、新しいタブで開くリンクを出す", () => {
    process.env.NEXT_PUBLIC_CONTACT_FORM_URL = "https://forms.gle/example";
    const html = renderToStaticMarkup(<ContactPage />);
    expect(html).toContain('href="https://forms.gle/example"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).not.toContain("準備中");
  });

  it("フォームの URL が無いときは、リンクを出さずに「準備中」と出す", () => {
    delete process.env.NEXT_PUBLIC_CONTACT_FORM_URL;
    const html = renderToStaticMarkup(<ContactPage />);
    expect(html).toContain("準備中");
    expect(html).not.toContain('target="_blank"');
  });
});
