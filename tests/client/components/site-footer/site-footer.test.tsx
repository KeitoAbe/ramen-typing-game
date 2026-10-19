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

  it("オープンソース（MIT）であることを、文章ではなく短い表記で出す", () => {
    expect(html).toContain("オープンソース（MIT）");
    expect(html).not.toContain("このゲームはオープンソース");
  });

  it("GitHub へのリンクを、ほかのリンクと並べて、新しいタブで開くと分かる形で出す", () => {
    expect(html).toContain(`href="${REPOSITORY_URL}"`);
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toMatch(
      /<nav aria-label="サイトの情報">.*>GitHub<span class="sr-only">（新しいタブで開きます）<\/span><\/a>.*<\/nav>/,
    );
  });
});
