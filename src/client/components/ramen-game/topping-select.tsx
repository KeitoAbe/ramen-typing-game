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
 * 食券を買ったあと、プレイを始める前の画面。屋台の前に出したお品書きの板で、トッピングを足すかを選ぶ。
 * 何も足さずに始めることもできる。チェックボックスとボタンなので、キーボードだけで選んで始められる
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
      {/* お品書きが読みやすいよう、屋台の絵を夜の色で少し沈める */}
      <YataiScene />
      <div aria-hidden="true" className="absolute inset-0 bg-yatai-night/55" />

      <form
        onSubmit={submit}
        className="absolute top-[12%] left-[18%] flex h-[78%] w-[64%] flex-col rounded-[0.6cqw] border-[0.35cqw] border-yatai-sumi bg-yatai-kinari px-[2.4cqw] py-[1.6cqw] text-yatai-sumi shadow-[0.5cqw_0.5cqw_0_rgb(0_0_0/0.4)]"
      >
        <fieldset className="flex min-h-0 flex-1 flex-col">
          <legend className="w-full text-center font-display text-[3cqw] leading-tight tracking-[0.3em]">
            トッピング
          </legend>
          <p className="mt-[0.4cqw] text-center text-[1.3cqw] leading-snug font-bold">
            食券「{course.name}」を受け取りました。
            トッピングを足すと難しくなる代わりに、丼が 1 つにつき{" "}
            {TOPPING_PRICE_RATE} 倍で売れる
          </p>

          <ul className="mt-[1.4cqw] grid flex-1 grid-cols-2 gap-[1.6cqw]">
            {TOPPINGS.map((topping, index) => {
              const isChecked = toppings.includes(topping.id);
              return (
                <li key={topping.id}>
                  <label
                    className={`flex size-full cursor-pointer flex-col items-center justify-center gap-[0.6cqw] rounded-[0.6cqw] border-[0.35cqw] border-yatai-sumi px-[1cqw] py-[1cqw] text-center shadow-[0_0.5cqw_0_var(--color-yatai-wood-dark)] transition-colors duration-75 has-focus-visible:outline-[0.4cqw] has-focus-visible:outline-offset-[0.3cqw] has-focus-visible:outline-yatai-amber ${isChecked ? "bg-yatai-amber" : "bg-white/60 hover:bg-yatai-amber/50"}`}
                  >
                    <span className="flex items-center gap-[0.8cqw]">
                      <input
                        ref={index === 0 ? firstToppingRef : undefined}
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggle(topping.id)}
                        className="size-[2cqw] shrink-0 accent-yatai-lantern focus-visible:outline-none"
                      />
                      <span className="font-display text-[2.6cqw] leading-tight whitespace-nowrap">
                        {topping.name}
                      </span>
                    </span>
                    <span className="text-[1.3cqw] leading-snug font-bold">
                      {topping.effect}
                    </span>
                    <span className="text-[1.4cqw] font-bold text-yatai-lantern">
                      値段 ×{TOPPING_PRICE_RATE}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>

        <p className="mt-[1.2cqw] text-center text-[1.2cqw] font-bold">
          両方足すと ×{TOPPING_PRICE_RATE} × {TOPPING_PRICE_RATE}
          。何も足さずに始めてもよい
        </p>
        <button
          type="submit"
          className="mx-auto mt-[0.8cqw] w-[50%] rounded-[0.6cqw] border-[0.35cqw] border-yatai-sumi bg-yatai-lantern py-[0.8cqw] font-display text-[2.6cqw] leading-tight tracking-widest text-yatai-kinari shadow-[0_0.5cqw_0_var(--color-yatai-sumi)] transition-[translate,box-shadow,background-color] duration-75 hover:bg-yatai-lantern-dark focus-visible:outline-[0.4cqw] focus-visible:outline-offset-[0.3cqw] focus-visible:outline-yatai-amber active:translate-y-[0.5cqw] active:shadow-none"
        >
          いただきます
        </button>
      </form>
    </section>
  );
}
