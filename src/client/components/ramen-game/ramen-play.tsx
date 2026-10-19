import { type CSSProperties, Fragment } from "react";
import {
  EmptyBowlIcon,
  RamenBowl,
} from "@/client/components/ramen-game/ramen-bowl";
import { SUMI, YataiScene } from "@/client/components/ramen-game/yatai-scene";
import { SOGGY_START_RATIO } from "@/client/lib/ramen-bowl";
import { bowlStyleOf } from "@/client/lib/ramen-bowl-style";
import { CLOSING_RUSH_PRICE_RATE } from "@/client/lib/ramen-closing-rush";
import type { RamenGameState } from "@/client/lib/ramen-game";
import { KAEDAMA_GAUGE_MAX } from "@/client/lib/ramen-kaedama";
import {
  eatenRatio,
  type ServedPricePop,
} from "@/client/lib/ramen-play-motion";
import type { ShopkeeperMood } from "@/client/lib/ramen-shopkeeper";
import { SPECIAL_BOWL_PRICE_RATE } from "@/client/lib/ramen-special-bowl";
import {
  STREAK_PRICE_RATES,
  streakPriceRate,
  streakTierOf,
} from "@/client/lib/ramen-streak";
import { toppingNames, toppingPriceRate } from "@/client/lib/ramen-topping";
import { remainingRomaji, typedRomaji } from "@/client/lib/romaji/typing";
import type { Order } from "@/types/order";

/** カウンターから下げている途中の丼 */
export type LeavingBowl = {
  /** 丼が替わるたびに変わる値。同じ注文が続いても演出をやり直すために使う */
  id: number;
  order: Order;
  reason: "eaten" | "discarded";
  /** 下げるときに、どこまで食べ進めていたか（0〜1） */
  eatenRatio: number;
};

/** 替え玉ゲージに並べる麺玉の数。ゲージがこの数に分けてたまる */
const NOODLE_BALL_COUNT = 10;
/** カウンターに積み上げる空の丼の上限。これを超えた分は杯数の数字だけで見せる */
const STACKED_BOWL_MAX = 6;

// 丼の置き場所（舞台の 1280×720 の座標を百分率にしたもの）。出す丼と下げる丼で同じ位置を使う
const BOWL_POSITION = "absolute top-[39.5%] left-[35.9%] h-[36.1%] w-[28.2%]";

/** 連続ボーナスの段（1〜3）ごとの、札の弾み方。段が上がるほど派手にする */
const STREAK_UP_ANIMATIONS: Record<number, string> = {
  1: "motion-safe:animate-streak-up-1",
  2: "motion-safe:animate-streak-up-2",
  3: "motion-safe:animate-streak-up-3",
};

/** ×1.5 に上がったとき、連続の札の周りに散らす火の粉の飛ぶ向き（cqw） */
const STREAK_SPARKS = [
  [-3.2, -2.4],
  [-1.2, -3.4],
  [1.4, -3.2],
  [3.4, -2],
  [-3.6, 0.6],
  [3.8, 0.8],
] as const;

type Props = {
  state: Extract<RamenGameState, { status: "playing" }>;
  /** 丼が替わるたびに変わる値 */
  bowlId: number;
  leavingBowl: LeavingBowl | null;
  onLeavingBowlEnd: () => void;
  /** 最後に平らげた丼の値段。丼のあたりから浮かび上がらせる */
  pricePop: ServedPricePop | null;
  shopkeeperMood: ShopkeeperMood;
};

/** プレイ画面。夜の屋台のカウンターに丼が出てくる */
export function RamenPlay({
  state,
  bowlId,
  leavingBowl,
  onLeavingBowlEnd,
  pricePop,
  shopkeeperMood,
}: Props) {
  const order = state.orders[state.orderIndex];
  const freshness = state.orderRemainingMs / state.orderSoggyLimitMs;
  const isGettingSoggy = freshness < 1 - SOGGY_START_RATIO;
  const filledNoodleBallCount = Math.floor(
    (state.kaedamaGauge / KAEDAMA_GAUGE_MAX) * NOODLE_BALL_COUNT,
  );
  const stackedBowlCount = Math.min(state.stats.servedCount, STACKED_BOWL_MAX);
  // いま出ている丼をミスなしで平らげたときにかかる、連続杯数の倍率
  const streakRate = state.isCleanBowl ? streakPriceRate(state.streak + 1) : 1;
  // 連続ボーナスがかかる杯数（3 杯）まで続いたときだけ、連続杯数を見せる
  const streakTier = streakTierOf(state.streak);
  const isStreakShown = streakTier > 0;
  const toppingNameList = toppingNames(state.toppings);
  const toppingRate = toppingPriceRate(state.toppings);
  const typed = typedRomaji(state.typing);

  return (
    <section className="absolute inset-0">
      <YataiScene
        shopkeeperMood={shopkeeperMood}
        isClosingRush={state.isClosingRush}
        hasStrayCat
      />

      {/* 残り時間: 左の柱に掛けた丸い時計。閉店間際は文字盤を琥珀色に替える。
          提灯に重ならないよう、提灯の下端より下に掛ける */}
      <div className="absolute top-[52%] left-[3.2%] aspect-square w-[11%]">
        <svg
          viewBox="0 0 100 100"
          aria-hidden="true"
          className="absolute inset-0 size-full overflow-visible"
        >
          {/* 柱の釘から下げた紐 */}
          <path
            d="M50 -14 L36 6 M50 -14 L64 6"
            fill="none"
            stroke={SUMI}
            strokeWidth={3}
          />
          <circle
            cx={50}
            cy={50}
            r={46}
            fill={
              state.isClosingRush
                ? "var(--color-yatai-amber)"
                : "var(--color-yatai-kinari)"
            }
            stroke={SUMI}
            strokeWidth={5}
          />
          {/* 文字盤の目盛り */}
          {Array.from({ length: 12 }, (_, index) => (
            <line
              // biome-ignore lint/suspicious/noArrayIndexKey: 並び替わらない
              key={index}
              x1={50}
              y1={9}
              x2={50}
              y2={index % 3 === 0 ? 17 : 13}
              stroke={SUMI}
              strokeWidth={index % 3 === 0 ? 4 : 2.5}
              strokeLinecap="round"
              transform={`rotate(${index * 30} 50 50)`}
            />
          ))}
        </svg>
        <p className="relative flex size-full flex-col items-center justify-center text-yatai-sumi">
          <span className="sr-only">残り時間</span>
          <span className="font-display text-[3.4cqw] leading-none">
            {Math.ceil(state.remainingMs / 1000)}
          </span>
          <span className="text-[1.3cqw] leading-tight font-bold">秒</span>
        </p>
      </div>

      {/* 閉店間際の知らせ: 時計の下のカウンターに掛けた木札。切り替わりだけを読み上げる */}
      <div aria-live="polite" className="absolute top-[81%] left-[1.5%]">
        {state.isClosingRush && (
          <p className="stage-wood-board flex flex-col items-center px-[1cqw] py-[0.5cqw] leading-tight font-bold whitespace-nowrap text-yatai-amber">
            <span className="text-[1.6cqw]">閉店間際！</span>
            <span className="text-[1.25cqw]">
              値段 {CLOSING_RUSH_PRICE_RATE} 倍・早くのびる
            </span>
          </p>
        )}
      </div>

      {/* 連続杯数: 丼の左に短く出す。連続ボーナスがかかる杯数に届くまでは、読み上げにだけ出す。
          倍率の段が上がるたびに作り直して、札を弾ませる */}
      <p
        key={`streak-${streakTier}`}
        className={
          isStreakShown
            ? `stage-wood-board absolute top-[46%] left-[21%] flex items-baseline gap-[0.4cqw] px-[0.8cqw] py-[0.3cqw] font-bold whitespace-nowrap ${STREAK_UP_ANIMATIONS[streakTier]} motion-reduce:animate-streak-flash`
            : "sr-only"
        }
      >
        <span className="font-display text-[2.2cqw] leading-none">
          {state.streak}
        </span>
        <span className="text-[1.3cqw]">杯連続</span>
        <span className="text-[1.4cqw] tabular-nums text-yatai-amber">
          ×{streakRate.toFixed(1)}
        </span>
        {/* いちばん上の段（×1.5）に上がったときは、札の周りに火の粉を散らす */}
        {streakTier === STREAK_PRICE_RATES.length &&
          STREAK_SPARKS.map(([x, y]) => (
            <span
              key={`${x}-${y}`}
              aria-hidden="true"
              style={
                {
                  "--spark-x": `${x}cqw`,
                  "--spark-y": `${y}cqw`,
                } as CSSProperties
              }
              className="pointer-events-none absolute top-1/2 left-1/2 hidden size-[0.6cqw] rounded-full bg-yatai-amber motion-safe:block motion-safe:animate-streak-spark"
            />
          ))}
      </p>
      {/* 連続が途切れた知らせ: 連続杯数と同じ場所に出す */}
      <div aria-live="polite" className="absolute top-[52%] left-[21%]">
        {state.isStreakBrokenNoticeShown && (
          // 途切れるたびに作り直して、読み上げをやり直させる
          <p
            key={state.streakBrokenNoticeUntil}
            className="stage-wood-board px-[0.8cqw] py-[0.3cqw] text-[1.4cqw] font-bold whitespace-nowrap text-yatai-amber"
          >
            {state.brokenStreak} 杯の連続が途切れた
          </p>
        )}
      </div>

      {/* 平らげた杯数: カウンターに積み上げた空の丼と、その左の小さな数字 */}
      {/* 重ねた丼は縁だけが見えるよう、上に積むものほど下の丼にかぶせる */}
      <div className="absolute bottom-[24.6%] left-[21.5%] flex w-[9%] flex-col-reverse [&>*+*]:-mb-[1.4cqw]">
        {Array.from({ length: stackedBowlCount }, (_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: 積んだ順のまま並び替わらない
          <EmptyBowlIcon key={index} />
        ))}
      </div>
      <p className="absolute right-[79%] bottom-[25%] flex items-baseline gap-[0.2cqw]">
        <span className="sr-only">平らげた杯数</span>
        <span className="font-display text-[2.4cqw] leading-none">
          {state.stats.servedCount}
        </span>
        <span className="text-[1.3cqw] font-bold">杯</span>
      </p>

      {/* 麺がのびるまでの時間: 丼の湯気と麺の色に加えて、丼の下に沿わせた細いゲージ */}
      <div
        role="progressbar"
        aria-label="麺がのびるまでの残り時間"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(freshness * 100)}
        aria-valuetext={`のびるまで ${Math.ceil(state.orderRemainingMs / 1000)} 秒`}
        className="absolute top-[76.6%] left-[40%] h-[0.7cqw] w-[20%] overflow-hidden rounded-full bg-yatai-sumi"
      >
        <div
          className={`h-full rounded-full ${isGettingSoggy ? "bg-yatai-amber" : "bg-yatai-kinari"}`}
          style={{ width: `${Math.max(0, Math.min(1, freshness)) * 100}%` }}
        />
      </div>
      {/* 切り替わりだけを読み上げる。見た目は丼の湯気と麺の色で分かる */}
      <p aria-live="polite" className="sr-only">
        {isGettingSoggy ? "のびかけ" : "できたて"}
      </p>

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
            eatenRatio={leavingBowl.eatenRatio}
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
          eatenRatio={eatenRatio(state.typing)}
          isSpecial={state.isSpecialBowl}
        />
        {/* 特別な丼: 丼の上に掲げる赤い札。読み上げは注文の札の側で行う */}
        {state.isSpecialBowl && (
          <p
            aria-hidden="true"
            className="absolute -top-[2.2cqw] left-1/2 flex -translate-x-1/2 items-baseline gap-[0.6cqw] rounded-[0.6cqw] bg-yatai-amber px-[1cqw] py-[0.3cqw] whitespace-nowrap text-yatai-sumi"
          >
            <span className="font-display text-[1.8cqw] leading-tight">
              店主のおすすめ
            </span>
            <span className="text-[1.25cqw] font-bold">
              値段 {SPECIAL_BOWL_PRICE_RATE} 倍
            </span>
          </p>
        )}
      </div>

      {/* 平らげた丼の値段: 丼の上から浮かび上がって消える。倍率がかかった丼は琥珀色にして、かかった倍率を添える。
          平らげるたびに作り直して演出をやり直す。消えたあとは透明なまま残し、次に平らげたときに差し替える */}
      {/* 浮かび上がる値段は見た目だけなので、同じ内容を読み上げ用に置く。
          注文の切り替わりの読み上げを妨げないよう、自動では読み上げない */}
      {pricePop && (
        <p className="sr-only">
          平らげた丼の値段 {pricePop.price.toLocaleString("ja-JP")} 円
          {pricePop.bonuses.length > 0 &&
            `（${pricePop.bonuses.map(({ label }) => label).join("・")}）`}
        </p>
      )}
      {pricePop && (
        <div
          key={`price-${pricePop.id}`}
          aria-hidden="true"
          data-testid="price-pop"
          className="pointer-events-none absolute top-[24%] left-1/2 flex -translate-x-1/2 flex-col items-center whitespace-nowrap [text-shadow:0_0.2cqw_0_var(--color-yatai-sumi),0_0_0.6cqw_var(--color-yatai-sumi)] motion-safe:animate-price-pop motion-reduce:animate-price-fade"
        >
          <span
            className={`font-display text-[3cqw] leading-none tabular-nums ${pricePop.bonuses.length > 0 ? "text-yatai-amber" : "text-yatai-kinari"}`}
          >
            +{pricePop.price.toLocaleString("ja-JP")} 円
          </span>
          {pricePop.bonuses.length > 0 && (
            <span className="mt-[0.3cqw] text-[1.4cqw] leading-tight font-bold text-yatai-amber">
              {pricePop.bonuses.map(({ label }) => label).join("・")}
            </span>
          )}
        </div>
      )}

      {/* 注文の文・よみ・ローマ字: 丼の手前に置いた注文の札。画面の主役なので、ほかの表示より大きく出す */}
      <div className="stage-paper absolute top-[79.5%] left-[24%] flex h-[18.5%] w-[52%] flex-col items-center justify-center">
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
            <p className="text-[3.2cqw] leading-tight font-bold">
              {order.text}
            </p>
            <p className="text-[1.4cqw] leading-tight">{order.reading}</p>
          </Fragment>
        </div>
        {/* ミスするたびに作り直して、ローマ字を横に震わせる（動きを抑える設定では短く明滅させる） */}
        <p
          key={`romaji-${state.stats.missCount}`}
          className={`font-mono text-[2.4cqw] leading-tight tracking-wide ${state.stats.missCount > 0 ? "motion-safe:animate-romaji-shake motion-reduce:animate-miss-flash" : ""}`}
        >
          {/* E2E テストが、打った文字が動かないことを確かめるための目印 */}
          <span
            data-testid="typed-romaji"
            className="text-yatai-lantern-dark underline decoration-[0.15cqw] underline-offset-[0.3cqw]"
          >
            {typed}
          </span>
          {/* E2E テストが、これから打つローマ字を読んで打つための目印 */}
          <span data-testid="remaining-romaji" className="font-bold">
            {remainingRomaji(state.typing)}
          </span>
        </p>
      </div>

      {/* 替え玉ゲージ: カウンターの右に並べた麺玉 */}
      <div className="absolute top-[82%] left-[77.5%] flex flex-col items-start gap-[0.3cqw]">
        <p aria-hidden="true" className="text-[1.4cqw] leading-tight font-bold">
          替え玉
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
                  opacity={0.6}
                />
              )}
            </svg>
          ))}
        </div>
      </div>
      {/* トッピング: 左上の夜空に掛けた札。足していなければ出さない */}
      {toppingNameList.length > 0 && (
        <div className="stage-wood-board absolute top-[1.5cqw] left-[1.5cqw] flex flex-col px-[0.8cqw] py-[0.4cqw]">
          <p className="text-[1.25cqw] font-bold">
            {/* 両方なら 1.3 × 1.3 = 1.69 倍。小数の誤差は表示に出さない */}
            トッピング（値段 ×{Math.round(toppingRate * 100) / 100}）
          </p>
          <ul className="flex gap-[0.6cqw]">
            {toppingNameList.map((name) => (
              <li
                key={name}
                className="text-[1.4cqw] leading-tight font-bold whitespace-nowrap"
              >
                {name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 日本語入力の案内: 屋根より上の夜空に掲げる札。読み上げられるよう、入れ物は常に置いておく */}
      <div
        aria-live="polite"
        className="absolute top-[1.5cqw] left-1/2 -translate-x-1/2"
      >
        {state.isImeNoticeShown && (
          <p className="stage-paper flex flex-col items-center px-[1.2cqw] py-[0.5cqw] whitespace-nowrap">
            <span className="text-[1.8cqw] leading-tight font-bold text-yatai-lantern-dark">
              日本語入力がオンになっています
            </span>
            <span className="text-[1.4cqw] leading-tight font-bold">
              半角英数（IME オフ）に切り替えて打ってください
            </span>
          </p>
        )}
      </div>

      {/* 替え玉の知らせ: 店主の顔の右に出す吹き出し。
          三角の先が、はちまきの結び目の下で顔の右の縁（舞台の x 74.3%, y 59%）から少し離れた所に来るよう置く */}
      <div
        aria-live="polite"
        className="absolute top-[56.2%] left-[75.7%] w-[14.4%]"
      >
        {state.isKaedamaNoticeShown && (
          // 替え玉のたびに作り直して、飛び出す演出をやり直す
          <p
            key={state.stats.kaedamaCount}
            className="relative origin-left rounded-[1.2cqw] bg-yatai-kinari px-[0.8cqw] py-[0.5cqw] text-center text-[1.6cqw] leading-tight font-bold text-yatai-lantern-dark shadow-[0_0.2cqw_0.8cqw_rgb(0_0_0/0.3)] motion-safe:animate-kaedama-pop"
          >
            へい、替え玉！
            <span
              aria-hidden="true"
              className="absolute top-[30%] -left-[0.6cqw] size-[1.4cqw] rotate-45 bg-yatai-kinari"
            />
          </p>
        )}
      </div>
    </section>
  );
}
