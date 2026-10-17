import { COURSES, type Course } from "@/client/lib/ramen-course";
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
const tokumori: Course = { ...nami, id: "tokumori", name: "特盛り" };

function resultOf(bill: number, accuracy: number): PlayResult {
  return { ...summarizePlay(emptyPlayStats, 60_000), bill, accuracy };
}

describe("decideTitle", () => {
  it.each([
    // お会計, 正確率, 称号
    [0, 0, "通りすがりの客"],
    [499, 1, "通りすがりの客"],
    [500, 1, "腹ぺこの客"],
    [999, 1, "腹ぺこの客"],
    [1_000, 0.5, "常連さん"],
    [1_199, 1, "常連さん"],
    [1_200, 0.9, "麺通"],
    [1_499, 1, "麺通"],
    [1_500, 0.95, "ラーメン評論家"],
    [5_000, 1, "ラーメン評論家"],
  ])("並でお会計 %d 円・正確率 %s なら「%s」", (bill, accuracy, name) => {
    expect(decideTitle(resultOf(bill, accuracy), nami).name).toBe(name);
  });

  it("お得額が足りていても、正確率が足りなければ下の称号になる", () => {
    expect(decideTitle(resultOf(1_500, 0.94), nami).name).toBe("麺通");
    expect(decideTitle(resultOf(1_500, 0.89), nami).name).toBe("常連さん");
  });

  it("特盛りで食券代の倍以上を正確に平らげると「屋台の伝説」", () => {
    expect(decideTitle(resultOf(2_000, 0.97), tokumori).name).toBe(
      "屋台の伝説",
    );
    expect(decideTitle(resultOf(2_000, 0.96), tokumori).name).toBe(
      "ラーメン評論家",
    );
    expect(decideTitle(resultOf(1_999, 1), tokumori).name).toBe(
      "ラーメン評論家",
    );
  });

  it("特盛り以外では「屋台の伝説」にならない", () => {
    expect(decideTitle(resultOf(10_000, 1), nami).name).toBe("ラーメン評論家");
  });

  it("お得額は食券代に対する割合で見るので、コースの値段が違っても同じ基準になる", () => {
    for (const course of COURSES) {
      expect(decideTitle(resultOf(course.price, 1), course).name).toBe(
        "常連さん",
      );
    }
  });

  it("称号は 5 段階以上あり、それぞれに店主の一言がある", () => {
    const titles = new Map<string, string>();
    for (const course of [nami, tokumori]) {
      for (const bill of [0, 500, 1_000, 1_200, 1_500, 2_000]) {
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
