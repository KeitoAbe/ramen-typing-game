import {
  COURSES,
  type Course,
  courseBalance,
  formatBalance,
  ordersForCourse,
} from "@/client/lib/ramen-course";
import type { Order } from "@/types/order";

const course: Course = {
  id: "nami",
  name: "並",
  price: 800,
  timeLimitMs: 60_000,
  minReadingLength: 2,
  maxReadingLength: 4,
};

describe("COURSES", () => {
  it("食券代は寿司打のコース料金に寄せた 3,000 / 5,000 / 10,000 円", () => {
    expect(COURSES.map((c) => c.price)).toEqual([3_000, 5_000, 10_000]);
  });

  it("並・大盛り・特盛りの順に、値段も制限時間も上がっていく", () => {
    expect(COURSES.map((c) => c.name)).toEqual(["並", "大盛り", "特盛り"]);
    for (let i = 1; i < COURSES.length; i++) {
      expect(COURSES[i].price).toBeGreaterThan(COURSES[i - 1].price);
      expect(COURSES[i].timeLimitMs).toBeGreaterThan(
        COURSES[i - 1].timeLimitMs,
      );
      expect(COURSES[i].minReadingLength).toBeGreaterThan(
        COURSES[i - 1].minReadingLength,
      );
    }
  });
});

describe("ordersForCourse", () => {
  it("よみの文字数が下限と上限のあいだ（両端を含む）の注文だけを返す", () => {
    const orders: Order[] = [
      { id: "1", text: "麺", reading: "め" },
      { id: "2", text: "塩", reading: "しお" },
      { id: "3", text: "しょうゆ", reading: "しょうゆ" },
      { id: "4", text: "味噌ラーメン", reading: "みそらーめん" },
    ];
    expect(ordersForCourse(orders, course).map((order) => order.id)).toEqual([
      "2",
      "3",
    ]);
  });
});

describe("courseBalance", () => {
  it("お会計が食券代を上回れば正の差額になる", () => {
    expect(courseBalance(1_200, course)).toBe(400);
  });

  it("お会計が食券代に届かなければ負の差額になる", () => {
    expect(courseBalance(500, course)).toBe(-300);
  });

  it("お会計と食券代が同じなら差額は 0", () => {
    expect(courseBalance(800, course)).toBe(0);
  });
});

describe("formatBalance", () => {
  it("正の差額は「◯円お得」と出す", () => {
    expect(formatBalance(1_400)).toBe("1,400 円お得");
  });

  it("負の差額は「◯円損」と出す", () => {
    expect(formatBalance(-300)).toBe("300 円損");
  });

  it("差額が 0 なら損はしていないので「0 円お得」と出す", () => {
    expect(formatBalance(0)).toBe("0 円お得");
  });
});
