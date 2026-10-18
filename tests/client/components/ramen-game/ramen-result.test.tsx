import { renderToStaticMarkup } from "react-dom/server";
import { RamenResult } from "@/client/components/ramen-game/ramen-result";
import { COURSES } from "@/client/lib/ramen-course";
import { emptyPlayStats, summarizePlay } from "@/client/lib/ramen-result";
import { RECEIPT_ROW_COUNT } from "@/client/lib/ramen-result-reveal";

// 最初の描画（結果画面が出た瞬間）は、結果発表の演出の始まりの姿になる
function render(): string {
  const result = summarizePlay(
    {
      ...emptyPlayStats,
      servedCount: 3,
      bill: 1200,
      correctKeyCount: 40,
      missCount: 2,
    },
    60_000,
  );
  return renderToStaticMarkup(
    <RamenResult
      course={COURSES[0]}
      toppings={[]}
      result={result}
      personalBest={null}
      onRevealSkip={() => {}}
      onReplay={() => {}}
    />,
  );
}

/** 指定した属性を持つ span の中身 */
function spanTexts(html: string, attribute: string): string[] {
  return [
    ...html.matchAll(new RegExp(`<span ${attribute}>(.*?)</span>`, "g")),
  ].map(([, inner]) => inner.replace(/<!-- -->/g, ""));
}

describe("RamenResult の結果発表の演出", () => {
  it("数字は 0 から数え上げ、読み上げには最後の値を渡す", () => {
    const html = render();
    const shown = spanTexts(html, 'aria-hidden="true"');
    const final = spanTexts(html, 'class="sr-only"');
    expect(shown).toContain("0 円");
    expect(shown).toContain("0 杯");
    expect(final).toContain("1,200 円");
    expect(final).toContain("3 杯");
    expect(final).toContain("95.2 %");
  });

  it("成績の表の行がすべて、上から順に現れる", () => {
    const html = render();
    const rows = html.match(/motion-safe:animate-receipt-row-in/g) ?? [];
    expect(rows).toHaveLength(RECEIPT_ROW_COUNT);
  });

  it("差し引き・判子・吹き出しは、それぞれ弾んで・押して・浮かんで出る", () => {
    const html = render();
    expect(html).toContain("motion-safe:animate-balance-pop");
    expect(html).toContain("motion-safe:animate-stamp-press");
    expect(html).toContain("motion-safe:animate-bubble-in");
  });
});
