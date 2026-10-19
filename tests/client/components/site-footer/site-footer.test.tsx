import { renderToStaticMarkup } from "react-dom/server";
import { SiteFooter } from "@/client/components/site-footer/site-footer";
import { REPOSITORY_URL } from "@/client/lib/repository";

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

  it("オープンソース（MIT ライセンス）であることが書かれている", () => {
    expect(html).toContain("オープンソース（MIT ライセンス）");
  });

  it("GitHub のリポジトリへのリンクを、新しいタブで開くと分かる形で出す", () => {
    expect(html).toContain(`href="${REPOSITORY_URL}"`);
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("GitHub のリポジトリ");
    expect(html).toContain("（新しいタブで開きます）");
  });
});
