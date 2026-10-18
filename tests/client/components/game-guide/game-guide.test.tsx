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

  it("遊び方は、券売機から伝票までの 4 つの手順と、稼ぐコツに分けて載せる", () => {
    const steps = html.match(/<ol>(.*?)<\/ol>/)?.[1] ?? "";
    expect(steps.match(/<li[\s>]/g)).toHaveLength(4);
    for (const step of [
      "食券を買う。",
      "注文をローマ字で打つ。",
      "麺がのびる前に食べる。",
      "伝票で成績を見る。",
    ]) {
      expect(steps).toContain(step);
    }
    for (const tip of [
      "替え玉で時間を延ばす。",
      "連続ボーナスを狙う。",
      "店主のおすすめを逃さない。",
    ]) {
      expect(html).toContain(tip);
    }
  });

  it("よくある質問は「Q.」「A.」を付けず、質問と答えを dt と dd に分ける", () => {
    expect(html).not.toContain("Q. ");
    expect(html).not.toContain("A. ");
    expect(html).toContain("キーを打っても文字が入らない</dt>");
  });

  it("コースの食券代と時間を、ゲームの設定どおりに載せる", () => {
    expect(html).toContain("3,000 円");
    expect(html).toContain("90 秒");
    expect(html).toContain("よみ 9 文字以上");
  });
});
