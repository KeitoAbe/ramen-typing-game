import { renderToStaticMarkup } from "react-dom/server";
import { SiteFooter } from "@/client/components/site-footer/site-footer";

describe("SiteFooter", () => {
  const html = renderToStaticMarkup(<SiteFooter />);

  it("プライバシーポリシー・運営者情報・お問い合わせへのリンクがある", () => {
    expect(html).toContain('href="/privacy"');
    expect(html).toContain(">プライバシーポリシー</a>");
    expect(html).toContain('href="/about"');
    expect(html).toContain(">運営者情報</a>");
    expect(html).toContain('href="/contact"');
    expect(html).toContain(">お問い合わせ</a>");
  });
});
