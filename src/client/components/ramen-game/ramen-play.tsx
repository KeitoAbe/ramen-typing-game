import { Fragment } from "react";
import {
  EmptyBowlIcon,
  RamenBowl,
} from "@/client/components/ramen-game/ramen-bowl";
import { YataiScene } from "@/client/components/ramen-game/yatai-scene";
import { SOGGY_START_RATIO, soggyLimitMs } from "@/client/lib/ramen-bowl";
import { bowlStyleOf } from "@/client/lib/ramen-bowl-style";
import type { RamenGameState } from "@/client/lib/ramen-game";
import { KAEDAMA_GAUGE_MAX } from "@/client/lib/ramen-kaedama";
import type { ShopkeeperMood } from "@/client/lib/ramen-shopkeeper";
import { SPECIAL_BOWL_PRICE_RATE } from "@/client/lib/ramen-special-bowl";
import { remainingRomaji, typedRomaji } from "@/client/lib/romaji/typing";
import type { Order } from "@/types/order";

/** カウンターから下げている途中の丼 */
export type LeavingBowl = {
  /** 丼が替わるたびに変わる値。同じ注文が続いても演出をやり直すために使う */
  id: number;
  order: Order;
  reason: "eaten" | "discarded";
};

/** 替え玉ゲージに並べる麺玉の数。ゲージがこの数に分けてたまる */
const NOODLE_BALL_COUNT = 10;
/** のびるまでの時間を表す湯気の数 */
const STEAM_ICON_COUNT = 5;
/** カウンターに積み上げる空の丼の上限。これを超えた分は杯数の数字だけで見せる */
const STACKED_BOWL_MAX = 6;

// 丼の置き場所（舞台の 1280×720 の座標を百分率にしたもの）。出す丼と下げる丼で同じ位置を使う
const BOWL_POSITION = "absolute top-[39.5%] left-[35.9%] h-[36.1%] w-[28.2%]";

const WOOD_PLATE =
  "rounded-[0.6cqw] border-[0.35cqw] border-yatai-sumi bg-yatai-kinari text-yatai-sumi shadow-[0_0.4cqw_0_var(--color-yatai-wood-dark)]";

type Props = {
  state: Extract<RamenGameState, { status: "playing" }>;
  /** 丼が替わるたびに変わる値 */
  bowlId: number;
  leavingBowl: LeavingBowl | null;
  onLeavingBowlEnd: () => void;
  shopkeeperMood: ShopkeeperMood;
};

/** プレイ画面。夜の屋台のカウンターに丼が出てくる */
export function RamenPlay({
  state,
  bowlId,
  leavingBowl,
  onLeavingBowlEnd,
  shopkeeperMood,
}: Props) {
  const order = state.orders[state.orderIndex];
  const freshness = state.orderRemainingMs / soggyLimitMs(order);
  const isGettingSoggy = freshness < 1 - SOGGY_START_RATIO;
  const filledSteamCount = Math.ceil(freshness * STEAM_ICON_COUNT);
  const filledNoodleBallCount = Math.floor(
    (state.kaedamaGauge / KAEDAMA_GAUGE_MAX) * NOODLE_BALL_COUNT,
  );
  const stackedBowlCount = Math.min(state.stats.servedCount, STACKED_BOWL_MAX);

  return (
    <section className="absolute inset-0">
      <YataiScene shopkeeperMood={shopkeeperMood} />

      {/* 残り時間: 左の柱に掛けた木札の時計 */}
      <div
        className={`${WOOD_PLATE} absolute top-[52%] left-[1.5%] flex w-[15.6%] flex-col items-center px-[0.8cqw] py-[0.6cqw]`}
      >
        <p className="text-[1.2cqw] font-bold">残り時間</p>
        <p className="flex items-center gap-[0.6cqw]">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[2.6cqw]">
            <circle
              cx={12}
              cy={12}
              r={10}
              fill="var(--color-yatai-amber)"
              stroke="currentColor"
              strokeWidth={2.5}
            />
            <path
              d="M12 6 V12 L16 14"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
            />
          </svg>
          <span className="font-display text-[3.4cqw] leading-none">
            {Math.ceil(state.remainingMs / 1000)}
          </span>
          <span className="text-[1.3cqw] font-bold">秒</span>
        </p>
      </div>

      {/* のびるまでの時間: 丼の横に下げた札と、湯気の量 */}
      <div
        className={`${WOOD_PLATE} absolute top-[46%] left-[19%] flex w-[16.5%] flex-col items-center gap-[0.3cqw] px-[0.6cqw] py-[0.5cqw]`}
      >
        <p className="text-[1.1cqw] font-bold">
          {/* 切り替わりだけを読み上げる。毎秒変わる残り秒数は含めない */}
          <span
            aria-live="polite"
            className={isGettingSoggy ? "text-yatai-lantern" : undefined}
          >
            {isGettingSoggy ? "のびかけ" : "できたて"}
          </span>
          ・のびるまで{" "}
          <span className="font-display">
            {Math.ceil(state.orderRemainingMs / 1000)}
          </span>{" "}
          秒
        </p>
        <div
          role="progressbar"
          aria-label="麺がのびるまでの残り時間"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(freshness * 100)}
          className="flex gap-[0.4cqw]"
        >
          {Array.from({ length: STEAM_ICON_COUNT }, (_, index) => (
            <svg
              // 並びの位置しか区別がないので、位置をキーにする
              // biome-ignore lint/suspicious/noArrayIndexKey: 並び替わらない
              key={index}
              viewBox="0 0 12 20"
              aria-hidden="true"
              className={`h-[1.8cqw] w-[1.1cqw] ${index < filledSteamCount ? "" : "opacity-20"}`}
            >
              <path
                d="M6 19 q-5 -4.5 0 -9 q5 -4.5 0 -9"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
              />
            </svg>
          ))}
        </div>
      </div>

      {/* 平らげた杯数: カウンターに積み上げた空の丼と、手前の札 */}
      {/* 重ねた丼は縁だけが見えるよう、上に積むものほど下の丼にかぶせる */}
      <div className="absolute bottom-[24.6%] left-[20%] flex w-[9%] flex-col-reverse [&>*+*]:-mb-[1.4cqw]">
        {Array.from({ length: stackedBowlCount }, (_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: 積んだ順のまま並び替わらない
          <EmptyBowlIcon key={index} />
        ))}
      </div>
      <div
        className={`${WOOD_PLATE} absolute top-[82.5%] left-[4%] flex w-[20%] items-baseline justify-center gap-[0.6cqw] py-[0.8cqw]`}
      >
        <span className="text-[1.4cqw] font-bold">平らげた杯数</span>
        <span className="font-display text-[3.2cqw] leading-none">
          {state.stats.servedCount}
        </span>
        <span className="text-[1.4cqw] font-bold">杯</span>
      </div>

      {leavingBowl && (
        // 動きを抑える設定では animationend が来ず残ってしまうので、下げる丼ごと出さない
        // 丼が替わった直後は出す丼と同じ番号になるので、接頭辞を付けてキーを分ける
        <div
          key={`leaving-${leavingBowl.id}`}
          aria-hidden="true"
          onAnimationEnd={onLeavingBowlEnd}
          className={`${BOWL_POSITION} pointer-events-none hidden motion-safe:block ${leavingBowl.reason === "eaten" ? "motion-safe:animate-bowl-eaten" : "motion-safe:animate-bowl-discarded"}`}
        >
          <RamenBowl
            look={bowlStyleOf(leavingBowl.order)}
            freshness={leavingBowl.reason === "eaten" ? 1 : 0}
            isSoggy={leavingBowl.reason === "discarded"}
          />
        </div>
      )}
      {/* 丼が替わるたびに作り直して、カウンターに出てくる演出をやり直す */}
      <div
        key={`serving-${bowlId}`}
        className={`${BOWL_POSITION} motion-safe:animate-bowl-serve ${state.isSpecialBowl ? "drop-shadow-[0_0_1.2cqw_var(--color-yatai-amber)]" : ""}`}
      >
        <RamenBowl
          look={bowlStyleOf(order)}
          freshness={freshness}
          isSoggy={isGettingSoggy}
        />
        {/* 特別な丼: 丼の上に掲げる赤い札。読み上げは注文の札の側で行う */}
        {state.isSpecialBowl && (
          <p
            aria-hidden="true"
            className="absolute -top-[2.2cqw] left-1/2 flex -translate-x-1/2 items-baseline gap-[0.6cqw] rounded-[0.6cqw] border-[0.3cqw] border-yatai-sumi bg-yatai-lantern px-[1cqw] py-[0.3cqw] whitespace-nowrap text-yatai-kinari shadow-[0_0.3cqw_0_var(--color-yatai-sumi)]"
          >
            <span className="font-display text-[1.8cqw] leading-tight">
              店主のおすすめ
            </span>
            <span className="text-[1.2cqw] font-bold text-yatai-amber">
              値段 {SPECIAL_BOWL_PRICE_RATE} 倍
            </span>
          </p>
        )}
      </div>

      {/* 注文の文・よみ・ローマ字: 丼の手前の木札 */}
      <div
        className={`${WOOD_PLATE} absolute top-[81%] left-[26.5%] flex h-[16.5%] w-[47%] flex-col items-center justify-center`}
      >
        {/* 注文の切り替わりだけを読み上げる。1 打ごとに変わるローマ字は含めない */}
        <div aria-live="polite" className="flex flex-col items-center">
          {/* 丼ごとに作り直して、同じ注文が続いても新しい注文として読み上げさせる */}
          <Fragment key={bowlId}>
            {state.isSpecialBowl && (
              <p className="sr-only">
                店主のおすすめの特別な丼です。値段が {SPECIAL_BOWL_PRICE_RATE}{" "}
                倍になります。
              </p>
            )}
            <p className="text-[2.6cqw] leading-tight font-bold">
              {order.text}
            </p>
            <p className="text-[1.3cqw] leading-tight">{order.reading}</p>
          </Fragment>
        </div>
        <p className="font-mono text-[2cqw] leading-tight tracking-wide">
          <span className="text-yatai-lantern underline decoration-[0.15cqw] underline-offset-[0.3cqw]">
            {typedRomaji(state.typing)}
          </span>
          <span className="font-bold">{remainingRomaji(state.typing)}</span>
        </p>
      </div>

      {/* 替え玉ゲージ: カウンターの右に並べた麺玉 */}
      <div
        className={`${WOOD_PLATE} absolute top-[81%] left-[75.5%] flex w-[21.5%] flex-col items-center gap-[0.3cqw] px-[0.6cqw] py-[0.5cqw]`}
      >
        <p className="text-[1.1cqw] font-bold">
          替え玉ゲージ（ミスなしで {KAEDAMA_GAUGE_MAX} 打で制限時間が延びる）
        </p>
        <div
          role="progressbar"
          aria-label="替え玉ゲージ"
          aria-valuemin={0}
          aria-valuemax={KAEDAMA_GAUGE_MAX}
          aria-valuenow={state.kaedamaGauge}
          className="grid grid-cols-5 gap-[0.3cqw]"
        >
          {Array.from({ length: NOODLE_BALL_COUNT }, (_, index) => (
            <svg
              // biome-ignore lint/suspicious/noArrayIndexKey: 並び替わらない
              key={index}
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="size-[1.9cqw]"
            >
              {index < filledNoodleBallCount ? (
                <g stroke="currentColor" strokeWidth={2} fill="none">
                  <circle cx={12} cy={12} r={10} fill="#f7d774" />
                  <path d="M5 10 q3.5 -3 7 0 t7 0 M5 15 q3.5 -3 7 0 t7 0" />
                </g>
              ) : (
                <circle
                  cx={12}
                  cy={12}
                  r={9}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  opacity={0.4}
                />
              )}
            </svg>
          ))}
        </div>
      </div>
      {/* 日本語入力の案内: 屋根より上の夜空に掲げる札。読み上げられるよう、入れ物は常に置いておく */}
      <div
        aria-live="polite"
        className="absolute top-[1.5cqw] left-1/2 -translate-x-1/2"
      >
        {state.isImeNoticeShown && (
          <p
            className={`${WOOD_PLATE} flex flex-col items-center px-[1.2cqw] py-[0.5cqw] whitespace-nowrap`}
          >
            <span className="text-[1.8cqw] leading-tight font-bold text-yatai-lantern">
              日本語入力がオンになっています
            </span>
            <span className="text-[1.4cqw] leading-tight font-bold">
              半角英数（IME オフ）に切り替えて打ってください
            </span>
          </p>
        )}
      </div>

      {/* 替え玉の知らせ: 店主の顔の右に出す吹き出し */}
      <div
        aria-live="polite"
        className="absolute top-[52%] left-[75.4%] w-[14.4%]"
      >
        {state.isKaedamaNoticeShown && (
          // 替え玉のたびに作り直して、飛び出す演出をやり直す
          <p
            key={state.stats.kaedamaCount}
            className="relative origin-left rounded-[1.2cqw] border-[0.3cqw] border-yatai-sumi bg-yatai-kinari px-[0.8cqw] py-[0.5cqw] text-center font-display text-[1.6cqw] leading-tight text-yatai-lantern motion-safe:animate-kaedama-pop"
          >
            へい、替え玉！
            <span
              aria-hidden="true"
              className="absolute top-[30%] -left-[0.9cqw] size-[1.4cqw] rotate-45 border-b-[0.3cqw] border-l-[0.3cqw] border-yatai-sumi bg-yatai-kinari"
            />
          </p>
        )}
      </div>
    </section>
  );
}
