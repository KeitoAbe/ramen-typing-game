import { renderToStaticMarkup } from "react-dom/server";
import { SiteHeader } from "@/client/components/site-header/site-header";

describe("SiteHeader", () => {
  const html = renderToStaticMarkup(
    <SiteHeader siteName="ラーメン屋台タイピング" align="stage" />,
  );

  it("サイト名をトップページへのリンクとして出す", () => {
    expect(html).toContain('href="/"');
    expect(html).toContain(">ラーメン屋台タイピング</a>");
  });

  it("サイト名を見出しにしない（ページの h1 は本文に 1 つだけ置く）", () => {
    expect(html).not.toMatch(/<h[1-6]/);
  });

  it("のれんの帯は飾りなので読み上げない", () => {
    expect(html).toMatch(/<div aria-hidden="true" class="noren-fringe/);
  });

  it("舞台の右に広告枠があるときだけ、同じ幅を右に空けてサイト名を舞台の左端にそろえる", () => {
    const spacer = "w-[300px]";
    expect(html).not.toContain(spacer);
    expect(
      renderToStaticMarkup(
        <SiteHeader
          siteName="ラーメン屋台タイピング"
          align="stage"
          withStageSideAd
        />,
      ),
    ).toContain(spacer);
  });

  it("運営まわりのページでは、本文の段の左端にそろえる", () => {
    const columnHtml = renderToStaticMarkup(
      <SiteHeader siteName="ラーメン屋台タイピング" align="column" />,
    );
    expect(columnHtml).toContain("page-column");
    expect(columnHtml).not.toContain("max-w-[960px]");
  });
});
