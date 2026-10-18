import { COURSES, type Course } from "@/client/lib/ramen-course";
import { describeCourse, describeStreakBonus } from "@/client/lib/ramen-guide";

function courseOf(id: Course["id"]): Course {
  const course = COURSES.find((c) => c.id === id);
  if (!course) throw new Error(`unknown course: ${id}`);
  return course;
}

describe("describeCourse", () => {
  it("食券代を桁区切りの円で、制限時間を秒で表す", () => {
    expect(describeCourse(courseOf("nami"))).toEqual({
      priceLabel: "3,000 円",
      timeLabel: "60 秒",
      readingLengthLabel: "よみ 2〜7 文字",
    });
  });

  it("注文の長さに上限がないコースは「◯文字以上」と表す", () => {
    expect(describeCourse(courseOf("tokumori"))).toEqual({
      priceLabel: "10,000 円",
      timeLabel: "120 秒",
      readingLengthLabel: "よみ 9 文字以上",
    });
  });
});

describe("describeStreakBonus", () => {
  it("ゲームの倍率を少ない杯数から順に並べる", () => {
    expect(describeStreakBonus()).toBe(
      "3 杯目から ×1.1、5 杯目から ×1.2、10 杯目から ×1.5",
    );
  });

  it("渡した順にかかわらず杯数の少ない順に並べ、倍率は小数 1 桁で表す", () => {
    expect(
      describeStreakBonus([
        { from: 4, rate: 2 },
        { from: 2, rate: 1.5 },
      ]),
    ).toBe("2 杯目から ×1.5、4 杯目から ×2.0");
  });
});
