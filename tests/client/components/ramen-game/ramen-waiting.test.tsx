import { renderToStaticMarkup } from "react-dom/server";
import { RamenWaiting } from "@/client/components/ramen-game/ramen-waiting";
import { COURSES } from "@/client/lib/ramen-course";
import {
  initialRamenGameState,
  type RamenGameState,
  ramenGameReducer,
} from "@/client/lib/ramen-game";
import type { ToppingId } from "@/client/lib/ramen-topping";

type WaitingState = Extract<RamenGameState, { status: "waiting" }>;

function waitingState(toppings: readonly ToppingId[] = []): WaitingState {
  const state = ramenGameReducer(initialRamenGameState, {
    type: "prepare",
    course: COURSES[0],
    toppings,
    orders: [{ id: "a", text: "塩", reading: "しお" }],
  });
  if (state.status !== "waiting") throw new Error("待つ状態にならない");
  return state;
}

/** タグを除いて、読み上げられる文字だけを空白でつないだもの */
function textOf(html: string): string {
  return html
    .replace(/<!-- -->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

describe("RamenWaiting", () => {
  it("スペースか Enter で始めることと、選んだコースを出す", () => {
    const course = COURSES[0];
    const text = textOf(
      renderToStaticMarkup(<RamenWaiting state={waitingState()} />),
    );
    expect(text).toContain("スペース か Enter で始める");
    expect(text).toContain(`${course.name}（${course.timeLimitMs / 1000} 秒）`);
    expect(text).toContain("トッピングなし");
  });

  it("足したトッピングを出す", () => {
    const text = textOf(
      renderToStaticMarkup(
        <RamenWaiting state={waitingState(["gekikara", "ninniku"])} />,
      ),
    );
    expect(text).toContain("トッピング: 激辛・ニンニクマシマシ");
  });

  it("丼と注文はまだ出さない", () => {
    const html = renderToStaticMarkup(<RamenWaiting state={waitingState()} />);
    expect(html).not.toContain("remaining-romaji");
    expect(textOf(html)).not.toContain("塩");
  });

  it("案内の紙は、フォーカスを移して読み上げさせられる", () => {
    const html = renderToStaticMarkup(<RamenWaiting state={waitingState()} />);
    expect(html).toMatch(/tabindex="-1"[^>]*>.*スペース/);
  });

  it("IME がオンのまま押したら、日本語入力の案内を出す", () => {
    const hidden = renderToStaticMarkup(
      <RamenWaiting state={waitingState()} />,
    );
    expect(hidden).not.toContain("日本語入力がオンになっています");
    const shown = renderToStaticMarkup(
      <RamenWaiting state={{ ...waitingState(), isImeNoticeShown: true }} />,
    );
    expect(shown).toContain("日本語入力がオンになっています");
  });
});
