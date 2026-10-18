import { type FormEvent, useEffect, useRef, useState } from "react";
import { YataiScene } from "@/client/components/ramen-game/yatai-scene";
import type { Course } from "@/client/lib/ramen-course";
import {
  TOPPING_PRICE_RATE,
  TOPPINGS,
  type ToppingId,
} from "@/client/lib/ramen-topping";

type Props = {
  course: Course;
  onStart: (toppings: readonly ToppingId[]) => void;
};

/**
 * 食券を買ったあと、プレイを始める前の画面。屋台のカウンターに買った食券を出し、
 * 横に並べた追加の券を押して、トッピングを足すかを選ぶ。何も足さずに始めることもできる。
 * 追加の券はチェックボックスなので、キーボードだけで選んで始められる
 */
export function ToppingSelect({ course, onStart }: Props) {
  const [toppings, setToppings] = useState<readonly ToppingId[]>([]);
  const firstToppingRef = useRef<HTMLInputElement>(null);

  // 食券のボタンは消えてフォーカスが外れるので、最初のトッピングに移す
  useEffect(() => {
    firstToppingRef.current?.focus();
  }, []);

  const toggle = (id: ToppingId) => {
    setToppings((current) =>
      current.includes(id)
        ? current.filter((topping) => topping !== id)
        : [...current, id],
    );
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onStart(toppings);
  };

  return (
    <section className="absolute inset-0">
      <YataiScene />

      {/* 店主のひとこと: 頭（舞台の x 66〜75%, y 47〜63%）の左の吹き出しで、トッピングを聞く */}
      <div className="absolute top-[46%] right-[36.5%] w-[22%] rounded-[1.2cqw] bg-yatai-kinari px-[1.4cqw] py-[0.8cqw] text-yatai-sumi shadow-[0_0.2cqw_0.8cqw_rgb(0_0_0/0.3)]">
        <p className="text-[1.25cqw]">店主</p>
        <p className="text-[1.6cqw] leading-snug font-bold">
          「トッピングは？」
        </p>
        <span
          aria-hidden="true"
          className="absolute top-[45%] -right-[0.9cqw] size-[2cqw] rotate-45 bg-yatai-kinari"
        />
      </div>

      {/* カウンターの上: 買った食券の横に、追加の券といただきますを並べる */}
      <form
        onSubmit={submit}
        className="absolute top-[78%] right-[4%] left-[4%] flex h-[16%] items-stretch gap-[1.5cqw]"
      >
        <div className="flex w-[17%] shrink-0 -rotate-2 flex-col items-center justify-center stage-paper px-[1cqw] leading-tight">
          <p className="text-[1.25cqw] font-bold">食券</p>
          <p className="font-display text-[3cqw]">{course.name}</p>
          <p className="text-[1.25cqw] whitespace-nowrap tabular-nums">
            {course.price.toLocaleString("ja-JP")} 円・
            {course.timeLimitMs / 1000} 秒
          </p>
        </div>

        <span
          aria-hidden="true"
          className="self-center font-display text-[2.6cqw] text-yatai-kinari"
        >
          ＋
        </span>

        <fieldset className="flex shrink-0 gap-[1.5cqw]">
          <legend className="sr-only">トッピング</legend>
          {TOPPINGS.map((topping, index) => {
            const isChecked = toppings.includes(topping.id);
            return (
              // 小さな券の形の押せる札。選ぶと押し込まれて、ランプが灯る
              <label
                key={topping.id}
                className={`relative flex h-full cursor-pointer flex-col justify-center gap-[0.4cqw] rounded-[0.6cqw] border-[0.35cqw] border-yatai-sumi px-[1.2cqw] text-yatai-sumi transition-[translate,box-shadow,background-color] duration-75 has-focus-visible:outline-[0.4cqw] has-focus-visible:outline-offset-[0.3cqw] has-focus-visible:outline-yatai-amber ${isChecked ? "translate-y-[0.5cqw] bg-yatai-amber" : "bg-yatai-kinari shadow-[0_0.5cqw_0_var(--color-yatai-wood-dark)] hover:bg-yatai-amber/50"}`}
              >
                {/* 見えないチェックボックスを札いっぱいに広げ、札のどこを押しても切り替わるようにする */}
                <input
                  ref={index === 0 ? firstToppingRef : undefined}
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggle(topping.id)}
                  className="absolute inset-0 cursor-pointer appearance-none focus-visible:outline-none"
                />
                <span className="flex items-center gap-[0.8cqw]">
                  <span
                    aria-hidden="true"
                    className={`size-[1.4cqw] shrink-0 rounded-full border-[0.25cqw] border-yatai-sumi ${isChecked ? "bg-yatai-lantern" : "bg-yatai-wood-dark"}`}
                  />
                  <span className="font-display text-[2.4cqw] leading-tight whitespace-nowrap">
                    {topping.name}
                  </span>
                </span>
                {/* 倍率の朱は、琥珀色の面では読みにくいので、灯っているあいだは墨にする */}
                <span className="text-[1.25cqw] leading-tight whitespace-nowrap">
                  {topping.effect}・
                  <span
                    className={`font-bold ${isChecked ? "" : "text-yatai-lantern-dark"}`}
                  >
                    値段 ×{TOPPING_PRICE_RATE}
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>

        <button
          type="submit"
          className="flex-1 rounded-[0.6cqw] border-[0.35cqw] border-yatai-sumi bg-yatai-lantern font-display text-[2.6cqw] leading-tight tracking-widest whitespace-nowrap text-yatai-kinari shadow-[0_0.5cqw_0_var(--color-yatai-sumi)] transition-[translate,box-shadow,background-color] duration-75 hover:bg-yatai-lantern-dark focus-visible:outline-[0.4cqw] focus-visible:outline-offset-[0.3cqw] focus-visible:outline-yatai-amber active:translate-y-[0.5cqw] active:shadow-none"
        >
          いただきます
        </button>
      </form>
    </section>
  );
}
