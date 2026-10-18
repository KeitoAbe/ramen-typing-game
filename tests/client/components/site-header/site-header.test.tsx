import { renderToStaticMarkup } from "react-dom/server";
import { SiteHeader } from "@/client/components/site-header/site-header";

describe("SiteHeader", () => {
  const html = renderToStaticMarkup(
    <SiteHeader siteName="ラーメン屋台タイピング" />,
  );

  it("サイト名をトップページへのリンクとして出す", () => {
    expect(html).toContain('href="/"');
    expect(html).toContain(">ラーメン屋台タイピング</a>");
  });

  it("サイト名を見出しにしない（ページの h1 は紹介の領域に 1 つだけ置く）", () => {
    expect(html).not.toMatch(/<h[1-6]/);
  });
});
