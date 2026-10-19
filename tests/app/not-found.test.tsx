import { renderToStaticMarkup } from "react-dom/server";
import NotFound, { metadata } from "@/app/not-found";

describe("404 のページ", () => {
  const html = renderToStaticMarkup(<NotFound />);

  it("日本語の h1 と、「ページ名 | サイト名」の title がある", () => {
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    expect(html).toMatch(/<h1[^>]*>ページが見つかりません<\/h1>/);
    expect(metadata.title).toBe(
      "ページが見つかりません | ラーメン屋台タイピング",
    );
  });

  it("正規 URL を持たない", () => {
    expect(metadata.alternates?.canonical).toBeUndefined();
  });

  it("ほかのページと同じヘッダーとフッター、トップページへ戻るリンクがある", () => {
    expect(html).toContain('href="/"');
    expect(html).toContain("<header");
    expect(html).toContain("noren-fringe");
    expect(html).toContain("<footer");
    expect(html).toContain("トップページでゲームを遊ぶ");
  });
});
