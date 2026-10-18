import type { Course } from "@/client/lib/ramen-course";
import {
  emptyPlayStats,
  type PlayResult,
  summarizePlay,
} from "@/client/lib/ramen-result";
import { decideTitle } from "@/client/lib/ramen-title";

const nami: Course = {
  id: "nami",
  name: "並",
  price: 1_000,
  timeLimitMs: 60_000,
  minReadingLength: 2,
  maxReadingLength: 7,
};
const oomori: Course = { ...nami, id: "oomori", name: "大盛り" };
const tokumori: Course = { ...nami, id: "tokumori", name: "特盛り" };

function resultOf(bill: number, accuracy: number): PlayResult {
  return { ...summarizePlay(emptyPlayStats, 60_000), bill, accuracy };
}

describe("decideTitle", () => {
  it.each([
    // お会計, 正確率, 称号
    [0, 0, "通りすがりの客"],
    [999, 1, "通りすがりの客"],
    [1_000, 1, "腹ぺこの客"],
    [2_999, 1, "腹ぺこの客"],
    [3_000, 0.5, "常連さん"],
    [6_999, 1, "常連さん"],
    [7_000, 0.9, "麺通"],
    [13_999, 1, "麺通"],
    [14_000, 0.95, "ラーメン評論家"],
    [100_000, 1, "ラーメン評論家"],
  ])("並でお会計 %d 円・正確率 %s なら「%s」", (bill, accuracy, name) => {
    expect(decideTitle(resultOf(bill, accuracy), nami).name).toBe(name);
  });

  it("お得額が足りていても、正確率が足りなければ下の称号になる", () => {
    expect(decideTitle(resultOf(14_000, 0.94), nami).name).toBe("麺通");
    expect(decideTitle(resultOf(14_000, 0.89), nami).name).toBe("常連さん");
  });

  it("同じお得額の割合でも、コースによって称号の基準が違う", () => {
    expect(decideTitle(resultOf(2_000, 1), nami).name).toBe("腹ぺこの客");
    expect(decideTitle(resultOf(2_000, 1), tokumori).name).toBe("常連さん");
    expect(decideTitle(resultOf(6_500, 1), oomori).name).toBe("麺通");
    expect(decideTitle(resultOf(6_500, 1), nami).name).toBe("常連さん");
  });

  it("特盛りで食券代の 8 倍以上を正確に平らげると「屋台の伝説」", () => {
    expect(decideTitle(resultOf(8_000, 0.975), tokumori).name).toBe(
      "屋台の伝説",
    );
    expect(decideTitle(resultOf(8_000, 0.97), tokumori).name).toBe(
      "ラーメン評論家",
    );
    expect(decideTitle(resultOf(7_999, 1), tokumori).name).toBe(
      "ラーメン評論家",
    );
  });

  it("特盛り以外では「屋台の伝説」にならない", () => {
    expect(decideTitle(resultOf(100_000, 1), nami).name).toBe("ラーメン評論家");
    expect(decideTitle(resultOf(100_000, 1), oomori).name).toBe(
      "ラーメン評論家",
    );
  });

  it("称号は 5 段階以上あり、それぞれに店主の一言がある", () => {
    const titles = new Map<string, string>();
    for (const course of [nami, tokumori]) {
      for (const bill of [0, 1_000, 3_000, 7_000, 14_000, 100_000]) {
        const title = decideTitle(resultOf(bill, 1), course);
        titles.set(title.id, title.remark);
      }
    }
    expect(titles.size).toBeGreaterThanOrEqual(5);
    for (const remark of titles.values()) {
      expect(remark).not.toBe("");
    }
  });
});
