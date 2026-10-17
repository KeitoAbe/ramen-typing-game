import { bowlStyleOf } from "@/client/lib/ramen-bowl-style";
import type { Order } from "@/types/order";

const order = (text: string): Order => ({ id: text, text, reading: "" });

describe("bowlStyleOf", () => {
  it.each([
    ["味噌ラーメン", "miso"],
    ["塩でお願いします", "shio"],
    ["豚骨ひとつ", "tonkotsu"],
    ["あっさり醤油", "shoyu"],
    ["しょうゆ", "shoyu"],
  ] as const)("「%s」のスープは %s", (text, soup) => {
    expect(bowlStyleOf(order(text)).soup).toBe(soup);
  });

  it("スープに当たらない注文は醤油ラーメンとして描く", () => {
    expect(bowlStyleOf(order("餃子もひとつ"))).toEqual({
      soup: "shoyu",
      toppings: [],
    });
  });

  it.each([
    ["味玉トッピングで", "ajitama"],
    ["チャーシュー麺", "chashu"],
    ["ネギ多めで", "negi"],
    ["海苔増しで", "nori"],
    ["メンマください", "menma"],
  ] as const)("「%s」には %s をのせる", (text, topping) => {
    expect(bowlStyleOf(order(text)).toppings).toEqual([topping]);
  });

  it("スープとトッピングの両方を読み取る", () => {
    expect(bowlStyleOf(order("味噌チャーシュー味玉"))).toEqual({
      soup: "miso",
      toppings: ["chashu", "ajitama"],
    });
  });

  it("よみではなく画面に出す文で決める", () => {
    // よみに「しお」を含んでも、文に「塩」がなければ塩にしない
    expect(
      bowlStyleOf({ id: "x", text: "おしおき", reading: "おしおき" }).soup,
    ).toBe("shoyu");
  });
});
