import { renderToStaticMarkup } from "react-dom/server";
import { GameGuide } from "@/client/components/game-guide/game-guide";

// サーバーで描いた HTML に、検索エンジンが読む見出しと文章が入っているかを確かめる
describe("GameGuide", () => {
  const html = renderToStaticMarkup(<GameGuide />);

  it("ゲーム名とタイピングゲームであることが分かる h1 を 1 つだけ持つ", () => {
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    const h1 = html.match(/<h1[^>]*>(.*?)<\/h1>/)?.[1] ?? "";
    expect(h1).toContain("ラーメン屋台タイピング");
    expect(h1).toContain("タイピングゲーム");
  });

  it("紹介・遊び方・コースの違い・よくある質問の見出しがある", () => {
    for (const title of [
      "どんなゲーム？",
      "遊び方",
      "コースごとの違い",
      "よくある質問",
    ]) {
      expect(html).toContain(`>${title}</h2>`);
    }
  });

  it("検索で探されそうな言葉を本文に含める", () => {
    const body = html.replace(/<h1[^>]*>.*?<\/h1>/, "");
    for (const word of ["ラーメン", "タイピングゲーム", "ローマ字", "無料"]) {
      expect(body).toContain(word);
    }
  });

  it("コースの食券代と時間を、ゲームの設定どおりに載せる", () => {
    expect(html).toContain("3,000 円");
    expect(html).toContain("90 秒");
    expect(html).toContain("よみ 9 文字以上");
  });
});
