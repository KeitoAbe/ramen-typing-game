import type { Course } from "@/client/lib/ramen-course";
import { buildShareText, buildXShareUrl } from "@/client/lib/ramen-share";

const nami: Course = {
  id: "nami",
  name: "並",
  price: 3_000,
  timeLimitMs: 60_000,
  minReadingLength: 2,
  maxReadingLength: 7,
};

describe("buildShareText", () => {
  it("お得なときは、コース名・称号・お会計と「◯円お得」を入れる", () => {
    expect(buildShareText(nami, { bill: 8_000 }, { name: "麺通" })).toBe(
      [
        "ラーメン屋台タイピングで「並」の食券を使いました！",
        "称号: 麺通",
        "お会計: 8,000 円（5,000 円お得）",
      ].join("\n"),
    );
  });

  it("損なときは「◯円損」を入れる", () => {
    expect(
      buildShareText(nami, { bill: 1_200 }, { name: "通りすがりの客" }),
    ).toBe(
      [
        "ラーメン屋台タイピングで「並」の食券を使いました！",
        "称号: 通りすがりの客",
        "お会計: 1,200 円（1,800 円損）",
      ].join("\n"),
    );
  });
});

describe("buildXShareUrl", () => {
  it("X の投稿画面に、文とゲームの URL を下書きとして渡す", () => {
    const url = new URL(
      buildXShareUrl("称号: 麺通\nお会計: 8,000 円", "http://localhost:3000/"),
    );
    expect(url.origin + url.pathname).toBe("https://x.com/intent/post");
    expect(url.searchParams.get("text")).toBe("称号: 麺通\nお会計: 8,000 円");
    expect(url.searchParams.get("url")).toBe("http://localhost:3000/");
  });
});
