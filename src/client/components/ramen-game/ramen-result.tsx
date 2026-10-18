import { YataiScene } from "@/client/components/ramen-game/yatai-scene";
import { StageSign } from "@/client/components/stage/stage-sign";
import {
  type Course,
  courseBalance,
  formatBalance,
} from "@/client/lib/ramen-course";
import {
  type DailyBestRecord,
  formatDailyDate,
} from "@/client/lib/ramen-daily";
import type { PersonalBestRecord } from "@/client/lib/ramen-personal-best";
import { type PlayResult, topMissedKeys } from "@/client/lib/ramen-result";
import { buildShareText, buildXShareUrl } from "@/client/lib/ramen-share";
import type { Stamp } from "@/client/lib/ramen-stamp-card";
import { decideTitle, type RamenTitle } from "@/client/lib/ramen-title";
import { type ToppingId, toppingNames } from "@/client/lib/ramen-topping";

/** 結果画面に出す、打ち間違いの多いキーの数 */
const MISSED_KEY_RANK_LIMIT = 3;

type Props = {
  course: Course;
  /** 食券のあとに足したトッピング */
  toppings: readonly ToppingId[];
  result: PlayResult;
  /** 自己ベストとの比較。記録が済むまでは null */
  personalBest: PersonalBestRecord | null;
  /** 今日のお題の、その日・そのコースの最高記録との比較。いつものプレイと、記録が済むまでは null */
  dailyBest: DailyBestRecord | null;
  /** このプレイで新しく押したスタンプカードの判子。記録が済むまでは空 */
  newStamps: readonly Stamp[];
  onReplay: () => void;
};

/**
 * 成績の文を下書きにした X の投稿画面を新しいタブで開く。
 * デプロイ先が決まっていないので、ゲームの URL はいま開いているページから作る（クエリやハッシュは除く）
 */
function shareOnX(course: Course, result: PlayResult, title: RamenTitle) {
  const gameUrl = `${window.location.origin}${window.location.pathname}`;
  const shareUrl = buildXShareUrl(
    buildShareText(course, result, title),
    gameUrl,
  );
  window.open(shareUrl, "_blank", "noopener,noreferrer");
}

/** お得は赤、損は藍で書いて、ひと目で分かるようにする */
function balanceColor(balance: number): string {
  return balance >= 0 ? "text-yatai-lantern" : "text-yatai-ai";
}

/**
 * 閉店後の結果画面。夜の屋台を背にお会計の伝票を出し、称号を判子で押す。
 * 右の店主がひとこと添え、自己ベストを更新したら伝票の左に「新記録」ののぼりを立てる。
 * スタンプカードに新しく判子を押したら、吹き出しの下に並べる
 */
export function RamenResult({
  course,
  toppings,
  result,
  personalBest,
  dailyBest,
  newStamps,
  onReplay,
}: Props) {
  const names = toppingNames(toppings);
  const balance = courseBalance(result.bill, course);
  const title = decideTitle(result, course);
  const missedKeys = topMissedKeys(result.missedKeys, MISSED_KEY_RANK_LIMIT);
  const rows = [
    { label: "平らげた杯数", value: `${result.servedCount} 杯` },
    {
      label: "うち店主のおすすめ",
      value: `${result.specialServedCount} 杯`,
    },
    { label: "最大連続杯数", value: `${result.maxStreak} 杯` },
    { label: "のびて下げられた丼", value: `${result.discardedCount} 杯` },
    { label: "替え玉", value: `${result.kaedamaCount} 回` },
    { label: "正しく打ったキー数", value: `${result.correctKeyCount} 回` },
    { label: "ミスタイプ数", value: `${result.missCount} 回` },
    { label: "正確率", value: `${(result.accuracy * 100).toFixed(1)} %` },
    {
      label: "平均打鍵数",
      value: `${result.keysPerSecond.toFixed(1)} 回/秒`,
    },
  ];

  return (
    // 効果音の札と看板の文字は最小の大きさ（px）で止まり、狭い舞台では舞台の幅ほど縮まない。
    // そこで看板の上端は「効果音の札の下端」、吹き出しの上端は「看板の下端」より下に来るよう、
    // 札と看板の寸法（SoundToggle / StageSign / GameStage の corner）から計算した値を下限にする。
    // 幅 960px（いちばん大きい舞台）では % の値のほうが大きいので、位置は変わらない
    // - 札の下端 + 隙間: 置き場所 1.5cqw + 上下の余白 0.6cqw + 影 0.3cqw + 隙間 0.5cqw + 上下の枠 + 文字の行の高さ
    <section className="absolute inset-0 [--sign-top:max(9.5%,calc(2.9cqw+max(4px,0.5cqw)+1.5*max(11px,1.25cqw)))]">
      {/* 伝票と札が読みやすいよう、屋台の絵を夜の色で少し沈める */}
      <YataiScene />
      <div aria-hidden="true" className="absolute inset-0 bg-yatai-night/45" />

      {/* 屋台の屋根に載せた看板。右上の効果音の札と重ならないよう、その下・吹き出しの上に置く。
          吹き出しの位置は看板を 1 行として計算しているので、狭い舞台で幅が足りなくても折り返さない */}
      <div className="absolute top-(--sign-top) left-[60%] flex w-[36%] justify-center [&>h1]:whitespace-nowrap">
        <StageSign />
      </div>

      {/* お会計の伝票 */}
      <div className="absolute top-[4%] left-[19%] flex h-[92%] w-[38%] flex-col rounded-[0.3cqw] border-[0.3cqw] border-yatai-sumi bg-yatai-kinari px-[2.2cqw] py-[1.4cqw] text-yatai-sumi shadow-[0.5cqw_0.5cqw_0_rgb(0_0_0/0.4)]">
        <h2 className="font-display text-[3cqw] leading-tight tracking-[0.4em]">
          御会計
        </h2>
        <p className="text-[1.25cqw] font-bold">本日は閉店しました</p>

        {/* 称号の判子: 伝票の右上に、朱肉で斜めに押す。押す動きは傾き（rotate）と別の transform で付ける */}
        <div className="absolute top-[0.8cqw] right-[1.2cqw] flex rotate-[-10deg] flex-col items-center rounded-[0.8cqw] border-[0.4cqw] border-double border-yatai-lantern px-[0.8cqw] py-[0.3cqw] text-yatai-lantern opacity-90 mix-blend-multiply motion-safe:animate-stamp-press">
          <span className="text-[1.25cqw] leading-tight font-bold">称号</span>
          <span className="font-display text-[1.8cqw] leading-tight">
            {title.name}
          </span>
        </div>

        {/* 振り返りの欄を入れる場所をあけるため、成績は 2 列に並べる */}
        <dl className="mt-[1cqw] grid grid-cols-[1fr_auto_1fr_auto] gap-x-[1.5cqw] border-y-[0.25cqw] border-double border-yatai-sumi text-[1.25cqw]">
          {rows.map((row) => (
            <div
              key={row.label}
              className="col-span-2 grid grid-cols-subgrid border-b-[0.12cqw] border-dashed border-yatai-lantern/50 py-[0.25cqw] whitespace-nowrap last:border-b-0"
            >
              <dt className="font-bold">{row.label}</dt>
              <dd className="text-right font-display">{row.value}</dd>
            </div>
          ))}
        </dl>

        {/* 振り返り: 打ち間違いの多いキーと、平らげた丼。丼の一覧は伝票の残りの高さに収め、あふれたら中でスクロールする */}
        <div className="mt-[0.8cqw] flex min-h-0 flex-1 flex-col text-[1.25cqw]">
          <div className="flex items-center gap-x-[1cqw] whitespace-nowrap">
            <h3 className="font-bold">打ち間違いの多いキー</h3>
            {missedKeys.length === 0 ? (
              <p className="font-bold text-yatai-lantern">打ち間違いなし</p>
            ) : (
              <ol className="flex gap-x-[1cqw]">
                {missedKeys.map(({ key, count }) => (
                  <li key={key} className="flex items-center gap-x-[0.3cqw]">
                    <kbd className="min-w-[1.8cqw] rounded-[0.3cqw] border-[0.12cqw] border-yatai-sumi bg-white/60 px-[0.3cqw] text-center font-display leading-snug">
                      {key.toUpperCase()}
                    </kbd>
                    <span>{count} 回</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <h3 className="mt-[0.5cqw] font-bold">平らげた丼（出た順）</h3>
          {result.servedBowls.length === 0 ? (
            <p>平らげた丼はありません</p>
          ) : (
            <ol className="min-h-0 flex-1 overflow-y-auto border-y-[0.12cqw] border-dashed border-yatai-sumi">
              {result.servedBowls.map((bowl, index) => (
                // 同じ注文が二度出ることもあるので、平らげた順番で見分ける
                <li
                  // biome-ignore lint/suspicious/noArrayIndexKey: 一覧は平らげた順に足すだけで、並び替えや削除はない
                  key={index}
                  className="grid grid-cols-[2.4cqw_1fr_auto] gap-x-[0.6cqw] py-[0.15cqw] whitespace-nowrap"
                >
                  <span className="text-right font-display">{index + 1}</span>
                  <span className="truncate">{bowl.order.text}</span>
                  <span className="text-right font-display">
                    {bowl.price.toLocaleString("ja-JP")} 円
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <dl className="mt-[0.8cqw] grid grid-cols-[auto_1fr] items-baseline gap-x-[1cqw] gap-y-[0.2cqw]">
          <dt className="text-[1.4cqw] font-bold">食券</dt>
          <dd className="text-right text-[1.4cqw] font-bold">
            {course.name}（{course.price.toLocaleString("ja-JP")} 円）
          </dd>
          <dt className="text-[1.4cqw] font-bold">トッピング</dt>
          <dd className="text-right text-[1.4cqw] font-bold">
            {names.length === 0 ? "なし" : names.join("・")}
          </dd>
          <dt className="text-[1.6cqw] font-bold">お会計</dt>
          <dd className="text-right font-display text-[3.4cqw] leading-tight">
            {result.bill.toLocaleString("ja-JP")} 円
          </dd>
          <dt className="text-[1.6cqw] font-bold">差し引き</dt>
          <dd
            className={`text-right font-display text-[3.4cqw] leading-tight ${balanceColor(balance)}`}
          >
            {formatBalance(balance)}
          </dd>
        </dl>

        {/* 記録は表示のあとに済むので、出たときに読み上げる */}
        <div
          aria-live="polite"
          className="mt-auto border-t-[0.12cqw] border-dashed border-yatai-sumi pt-[0.5cqw] text-right text-[1.3cqw] font-bold"
        >
          {personalBest?.isUpdated && (
            // 伝票の左に立てるのぼり。伝票（位置の基準）からはみ出して置く
            <p className="absolute top-[6%] right-[calc(100%+3cqw)] flex h-[70%] w-[6.5cqw] flex-col items-center gap-[1cqw] border-[0.3cqw] border-yatai-sumi bg-yatai-lantern py-[1.2cqw] text-yatai-kinari shadow-[0.4cqw_0.4cqw_0_rgb(0_0_0/0.4)]">
              <span className="font-display text-[3.4cqw] leading-none [writing-mode:vertical-rl]">
                新記録
              </span>
              <span className="text-[1.3cqw] leading-tight [writing-mode:vertical-rl]">
                自己ベスト更新！
              </span>
            </p>
          )}
          {dailyBest && (
            <p>
              {dailyBest.isUpdated && (
                <span className="mr-[0.6cqw] rounded-[0.3cqw] bg-yatai-lantern px-[0.4cqw] text-yatai-kinari">
                  最高記録を更新！
                </span>
              )}
              今日のお題（{formatDailyDate(dailyBest.dateKey)}・{course.name}
              ）の最高記録:{" "}
              <span className={balanceColor(dailyBest.best)}>
                {formatBalance(dailyBest.best)}
              </span>
            </p>
          )}
          {personalBest && (
            <p>
              {course.name}の自己ベスト:{" "}
              <span className={balanceColor(personalBest.best)}>
                {formatBalance(personalBest.best)}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* 店主のひとこと: 頭の上の吹き出し。看板の下端（文字の行の高さ + 上下の余白 1.6cqw + 上下の枠 0.8cqw）に隙間 0.5cqw をあけて置く */}
      <div className="absolute top-[max(22%,calc(var(--sign-top)+1.25*max(20px,3.2cqw)+2.9cqw))] left-[61%] w-[35%] rounded-[1.4cqw] border-[0.3cqw] border-yatai-sumi bg-yatai-kinari px-[1.4cqw] py-[0.8cqw] text-yatai-sumi">
        <p className="text-[1.25cqw] font-bold">店主</p>
        <p className="text-[1.6cqw] leading-snug font-bold">
          「{title.remark}」
        </p>
        <span
          aria-hidden="true"
          className="absolute -bottom-[1.3cqw] left-[38%] size-[2cqw] rotate-45 border-r-[0.3cqw] border-b-[0.3cqw] border-yatai-sumi bg-yatai-kinari"
        />
      </div>

      {/* 新しく押した判子: 吹き出しの下・もう一杯の札の上に置く紙片。
          吹き出しの下端は 390px 幅の舞台でも 53% より上、札の上端は 81% なので、そのあいだに収める。
          記録は表示のあとに済むので、出たときに読み上げる */}
      <div aria-live="polite" className="absolute top-[57%] left-[61%] w-[35%]">
        {newStamps.length > 0 && (
          <div className="rounded-[0.3cqw] border-[0.25cqw] border-yatai-sumi bg-yatai-kinari px-[1cqw] py-[0.6cqw] text-yatai-sumi shadow-[0.3cqw_0.3cqw_0_rgb(0_0_0/0.35)]">
            <p className="text-[1.25cqw] leading-tight font-bold">
              スタンプカードに判子を押しました
            </p>
            {/* 判子が 9 個すべて並んでも 3 行に収まり、もう一杯の札に届かない大きさにしている */}
            <ul className="mt-[0.4cqw] flex flex-wrap gap-[0.4cqw]">
              {newStamps.map((stamp) => (
                <li
                  key={stamp.id}
                  className="rotate-[-4deg] rounded-[0.5cqw] border-[0.25cqw] border-double border-yatai-lantern px-[0.5cqw] font-display text-[1.25cqw] leading-[1.2] whitespace-nowrap text-yatai-lantern opacity-90 mix-blend-multiply motion-safe:animate-stamp-press"
                >
                  {stamp.name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* もう一杯と X で共有: カウンターに並べて置いた木札のボタン。吹き出しと同じ幅に収める */}
      <div className="absolute top-[81%] left-[61%] flex w-[35%] items-stretch gap-[1.5cqw]">
        <button
          type="button"
          onClick={onReplay}
          className="flex-[3] rounded-[0.6cqw] border-[0.35cqw] border-yatai-sumi bg-yatai-lantern py-[0.8cqw] font-display text-[2.8cqw] leading-tight tracking-widest text-yatai-kinari shadow-[0_0.5cqw_0_var(--color-yatai-sumi)] transition-[translate,box-shadow,background-color] duration-75 hover:bg-yatai-lantern-dark focus-visible:outline-[0.4cqw] focus-visible:outline-offset-[0.3cqw] focus-visible:outline-yatai-amber active:translate-y-[0.5cqw] active:shadow-none"
        >
          もう一杯
        </button>
        <button
          type="button"
          onClick={() => shareOnX(course, result, title)}
          className="flex-[2] rounded-[0.6cqw] border-[0.35cqw] border-yatai-sumi bg-yatai-kinari py-[0.8cqw] text-[1.8cqw] leading-tight font-bold whitespace-nowrap text-yatai-sumi shadow-[0_0.5cqw_0_var(--color-yatai-sumi)] transition-[translate,box-shadow,background-color] duration-75 hover:bg-yatai-amber focus-visible:outline-[0.4cqw] focus-visible:outline-offset-[0.3cqw] focus-visible:outline-yatai-amber active:translate-y-[0.5cqw] active:shadow-none"
        >
          X で共有
          <span className="sr-only">（新しいタブで開きます）</span>
        </button>
      </div>
    </section>
  );
}
