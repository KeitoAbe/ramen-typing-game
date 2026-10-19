import { renderToStaticMarkup } from "react-dom/server";
import { RamenPlay } from "@/client/components/ramen-game/ramen-play";
import { CLOSING_RUSH_THRESHOLD_MS } from "@/client/lib/ramen-closing-rush";
import { COURSES } from "@/client/lib/ramen-course";
import {
  initialRamenGameState,
  type RamenGameState,
  ramenGameReducer,
} from "@/client/lib/ramen-game";
import type { ServedPricePop } from "@/client/lib/ramen-play-motion";

type PlayingState = Extract<RamenGameState, { status: "playing" }>;

function playingState(overrides: Partial<PlayingState> = {}): PlayingState {
  const state = ramenGameReducer(initialRamenGameState, {
    type: "start",
    course: COURSES[0],
    orders: [{ id: "a", text: "塩", reading: "しお" }],
    now: 0,
    roll: 0.5,
  });
  if (state.status !== "playing") throw new Error("プレイが始まらない");
  return { ...state, ...overrides };
}

function render(
  state: PlayingState,
  pricePop: ServedPricePop | null = null,
): string {
  return renderToStaticMarkup(
    <RamenPlay
      state={state}
      bowlId={0}
      leavingBowl={null}
      onLeavingBowlEnd={() => {}}
      pricePop={pricePop}
      shopkeeperMood="normal"
    />,
  );
}

/** タグを除いて、読み上げられる文字だけを空白でつないだもの */
function textOf(html: string): string {
  // 隣り合う文字の区切りに React が入れるコメントは、空白にせずに消す
  return html
    .replace(/<!-- -->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** sr-only を付けた要素の中身（見た目には出ない文字） */
function srOnlyTexts(html: string): string[] {
  return [...html.matchAll(/<(\w+) class="sr-only">(.*?)<\/\1>/g)].map(
    ([, , inner]) => textOf(inner),
  );
}

describe("RamenPlay", () => {
  it("ルールを説明する文章を出さない", () => {
    const text = textOf(render(playingState()));
    expect(text).not.toContain("ミスなしで");
    expect(text).not.toContain("制限時間が延びる");
    expect(text).not.toContain("替え玉ゲージ（");
  });

  it("残り時間・平らげた杯数・のびるまでの残り・替え玉ゲージ・連続を読み上げる", () => {
    const html = render(
      playingState({
        remainingMs: 42_000,
        orderRemainingMs: 12_000,
        kaedamaGauge: 7,
        streak: 1,
      }),
    );
    const text = textOf(html);
    expect(text).toMatch(/残り時間 42 秒/);
    expect(text).toMatch(/平らげた杯数 0 杯/);
    expect(html).toContain('aria-valuetext="のびるまで 12 秒"');
    expect(html).toContain('aria-label="替え玉ゲージ"');
    expect(html).toContain('aria-valuenow="7"');
    expect(text).toMatch(/1 杯連続 ×1\.0/);
  });

  it("連続が 3 杯未満なら、連続杯数は読み上げにだけ出す", () => {
    const html = render(playingState({ streak: 2 }));
    expect(srOnlyTexts(html)).toContain("2 杯連続 ×1.1");
  });

  it("連続が 3 杯以上なら、連続杯数と倍率を見せる", () => {
    const html = render(playingState({ streak: 5 }));
    expect(textOf(html)).toMatch(/5 杯連続 ×1\.2/);
    expect(srOnlyTexts(html).some((text) => text.includes("杯連続"))).toBe(
      false,
    );
  });

  it("閉店間際は、値段の倍率と早くのびることを知らせる", () => {
    const html = render(
      playingState({
        remainingMs: CLOSING_RUSH_THRESHOLD_MS,
        isClosingRush: true,
      }),
    );
    expect(textOf(html)).toMatch(/閉店間際！ 値段 1\.5 倍・早くのびる/);
  });

  it("打った文字は、最後の 1 文字も分けずにまとめて出す", () => {
    const state = playingState();
    const typed = ramenGameReducer(state, { type: "key", key: "s", now: 0 });
    const html = render(
      ramenGameReducer(typed, {
        type: "key",
        key: "h",
        now: 0,
      }) as PlayingState,
    );
    expect(html).toMatch(
      /<span[^>]*data-testid="typed-romaji"[^>]*>sh<\/span>/,
    );
  });

  it("平らげた丼の値段と、上乗せした倍率を出す", () => {
    const html = render(playingState(), {
      id: 1,
      price: 1200,
      bonuses: [
        { kind: "special", label: "おすすめ ×2" },
        { kind: "streak", label: "連続 ×1.1" },
      ],
    });
    expect(textOf(html)).toContain("+1,200 円 おすすめ ×2・連続 ×1.1");
    // 浮かび上がる値段は見た目だけなので、同じ内容を読み上げ用にも出す
    expect(html).toContain(
      '<p class="sr-only">平らげた丼の値段 1,200 円（おすすめ ×2・連続 ×1.1）</p>',
    );
  });

  it("連続ボーナスが ×1.5 に上がったら、札の周りに火の粉を散らす", () => {
    expect(render(playingState({ streak: 10 }))).toContain(
      "animate-streak-spark",
    );
    expect(render(playingState({ streak: 5 }))).not.toContain(
      "animate-streak-spark",
    );
  });
});
