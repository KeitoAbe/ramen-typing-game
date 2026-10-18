import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { YataiScene } from "@/client/components/ramen-game/yatai-scene";
import { StageSign } from "@/client/components/stage/stage-sign";
import { trackShare } from "@/client/lib/analytics";
import {
  type Course,
  courseBalance,
  formatBalance,
} from "@/client/lib/ramen-course";
import type { PersonalBestRecord } from "@/client/lib/ramen-personal-best";
import { type PlayResult, topMissedKeys } from "@/client/lib/ramen-result";
import {
  BALANCE_POP_SECONDS,
  BILL_COUNT_SECONDS,
  BUBBLE_IN_SECONDS,
  CONFETTI_FALL_SECONDS,
  CONFETTI_MAX_DELAY_SECONDS,
  countUpValue,
  RECEIPT_ROW_COUNT_SECONDS,
  RECEIPT_ROW_IN_SECONDS,
  RECORD_POP_SECONDS,
  RESULT_REVEAL,
  receiptRowStartSeconds,
  STAMP_PRESS_SECONDS,
  shopkeeperReactionOf,
} from "@/client/lib/ramen-result-reveal";
import { buildShareText, buildXShareUrl } from "@/client/lib/ramen-share";
import { decideTitle, type RamenTitle } from "@/client/lib/ramen-title";
import { type ToppingId, toppingNames } from "@/client/lib/ramen-topping";
import { prefersReducedMotion } from "@/client/lib/reduced-motion";

/** 結果画面に出す、打ち間違いの多いキーの数 */
const MISSED_KEY_RANK_LIMIT = 3;

/** 伝票の成績の表の 1 行。点線で区切る */
const RECEIPT_ROW =
  "border-b-[0.12cqw] border-dashed border-yatai-sumi/30 py-[0.25cqw]";
/** 2 列に並べる短い項目の行。項目名と値の幅を、同じ列の行どうしでそろえる */
const RECEIPT_HALF_ROW = `col-span-2 grid grid-cols-subgrid ${RECEIPT_ROW}`;
/** 長い値の項目の行。表の幅いっぱいを使い、列の幅には影響させない */
const RECEIPT_FULL_ROW = `col-span-4 flex justify-between gap-x-[1cqw] ${RECEIPT_ROW}`;

/**
 * 自己ベスト更新の紙吹雪。[左端からの位置（%）, 色, 落ちる距離（cqw）, 回る角度, 遅れ（0〜1）]。
 * 描くたびに変わらないよう固定しておく
 */
const CONFETTI: readonly (readonly [number, string, number, number, number])[] =
  [
    [4, "lantern", 30, 400, 0.2],
    [10, "amber", 38, -320, 0.7],
    [16, "kinari", 26, 280, 0],
    [24, "lantern", 42, -400, 0.5],
    [31, "amber", 34, 360, 0.9],
    [38, "kinari", 40, -280, 0.3],
    [46, "lantern", 28, 320, 0.8],
    [54, "amber", 44, -360, 0.1],
    [62, "kinari", 32, 400, 0.6],
    [69, "lantern", 38, -320, 0.4],
    [76, "amber", 30, 280, 1],
    [83, "kinari", 42, -400, 0.2],
    [90, "lantern", 34, 360, 0.7],
    [96, "amber", 26, -280, 0.5],
  ];

const CONFETTI_COLORS: Readonly<Record<string, string>> = {
  lantern: "bg-yatai-lantern",
  amber: "bg-yatai-amber",
  kinari: "bg-yatai-kinari",
};

/** 演出の動きの長さと待ち時間を、段取りの秒で指定する */
function revealTiming(
  delaySeconds: number,
  durationSeconds: number,
): CSSProperties {
  return {
    animationDelay: `${delaySeconds}s`,
    animationDuration: `${durationSeconds}s`,
  };
}

/** ボタンやリンクの上の操作か。そのときは演出を飛ばさず、そのボタンを押す操作だけにする */
function isOnControl(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest("button, a, input, select, textarea") !== null
  );
}

/**
 * 結果発表の演出の時計。結果画面が出てからの秒を、演出が終わるまで描画のたびに進める。
 * 動きを抑える設定では、最初から演出を終えた姿にする。
 * Space・Enter・画面のクリックで飛ばしたら最終の表示にして、飛ばした時点の秒を onSkip に渡す。
 * ボタンの上の操作では飛ばさない（「もう一杯」のあとに飛ばすと、次の画面で判子の音が鳴ってしまう）
 */
function useResultReveal(onSkip: (elapsedSeconds: number) => void) {
  const [isRevealing, setIsRevealing] = useState(() => !prefersReducedMotion());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const elapsedRef = useRef(0);
  const sectionRef = useRef<HTMLElement>(null);
  // 親は描画のたびに新しい関数を渡すので、最新のものを ref で持ち、飛ばす処理を作り直さない
  const onSkipRef = useRef(onSkip);
  useEffect(() => {
    onSkipRef.current = onSkip;
  });

  useEffect(() => {
    if (!isRevealing) return;
    const startedAt = performance.now();
    let frame = 0;
    const step = () => {
      const seconds = (performance.now() - startedAt) / 1000;
      if (seconds >= RESULT_REVEAL.end) {
        setIsRevealing(false);
        return;
      }
      elapsedRef.current = seconds;
      setElapsedSeconds(seconds);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [isRevealing]);

  useEffect(() => {
    if (!isRevealing) return;
    const skip = () => {
      setIsRevealing(false);
      onSkipRef.current(elapsedRef.current);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== " " && event.key !== "Enter") return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (isOnControl(event.target)) return;
      // Space でページがスクロールしないようにする
      event.preventDefault();
      skip();
    };
    const handleClick = (event: MouseEvent) => {
      if (!isOnControl(event.target)) skip();
    };
    const section = sectionRef.current;
    window.addEventListener("keydown", handleKeyDown);
    section?.addEventListener("click", handleClick);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      section?.removeEventListener("click", handleClick);
    };
  }, [isRevealing]);

  return {
    sectionRef,
    isRevealing,
    // 演出を終えたら、どの数字も最後の値にする
    elapsedSeconds: isRevealing ? elapsedSeconds : Number.POSITIVE_INFINITY,
  };
}

type CountUpTextProps = {
  /** 数え上げている途中の文字 */
  shown: string;
  /** 最後に出す文字 */
  final: string;
  isRevealing: boolean;
};

/** 数え上げる数字。読み上げには途中の数字ではなく、最後の値を渡す */
function CountUpText({ shown, final, isRevealing }: CountUpTextProps) {
  if (!isRevealing) return final;
  return (
    <>
      <span aria-hidden="true">{shown}</span>
      <span className="sr-only">{final}</span>
    </>
  );
}

type Props = {
  course: Course;
  /** 食券のあとに足したトッピング */
  toppings: readonly ToppingId[];
  result: PlayResult;
  /** 自己ベストとの比較。記録が済むまでは null */
  personalBest: PersonalBestRecord | null;
  /** 結果発表の演出を途中で飛ばした。飛ばした時点の、結果画面が出てからの秒を渡す */
  onRevealSkip: (elapsedSeconds: number) => void;
  onReplay: () => void;
};

/**
 * 成績の文を下書きにした X の投稿画面を新しいタブで開く。
 * デプロイ先が決まっていないので、ゲームの URL はいま開いているページから作る（クエリやハッシュは除く）
 */
function shareOnX(course: Course, result: PlayResult, title: RamenTitle) {
  trackShare(course);
  const gameUrl = `${window.location.origin}${window.location.pathname}`;
  const shareUrl = buildXShareUrl(
    buildShareText(course, result, title),
    gameUrl,
  );
  window.open(shareUrl, "_blank", "noopener,noreferrer");
}

/** お得は朱、損は藍で書いて、ひと目で分かるようにする */
function balanceColor(balance: number): string {
  return balance >= 0 ? "text-yatai-lantern-dark" : "text-yatai-ai";
}

/** 伝票の成績の表で、数え上げる数字の項目 */
type CountedRow = {
  label: string;
  value: number;
  unit: string;
  /** 小数の桁数 */
  digits?: number;
};

/**
 * 閉店後の結果画面。夜の屋台を背にお会計の伝票を出し、称号を判子で押す。
 * 右の店主がひとこと添え、自己ベストを更新したら伝票の左に「新記録」ののぼりを立てる。
 * 結果発表の演出として、成績の行を上から順に出して数字を数え上げ、お会計 → 差し引き → 判子 → 吹き出しの順に出す。
 * 演出の途中でも、Space・Enter・クリックで飛ばせる
 */
export function RamenResult({
  course,
  toppings,
  result,
  personalBest,
  onRevealSkip,
  onReplay,
}: Props) {
  const { sectionRef, isRevealing, elapsedSeconds } =
    useResultReveal(onRevealSkip);
  const names = toppingNames(toppings);
  const balance = courseBalance(result.bill, course);
  const title = decideTitle(result, course);
  const missedKeys = topMissedKeys(result.missedKeys, MISSED_KEY_RANK_LIMIT);
  const reaction = shopkeeperReactionOf(title.id);
  // 店主は判子が押されてから喜ぶ。跳び上がるのは演出の中だけで、飛ばしたら笑顔だけにする
  const hasStamped = elapsedSeconds >= RESULT_REVEAL.stampEnd;
  const countedRows: CountedRow[] = [
    { label: "平らげた杯数", value: result.servedCount, unit: "杯" },
    {
      label: "うち店主のおすすめ",
      value: result.specialServedCount,
      unit: "杯",
    },
    { label: "最大連続杯数", value: result.maxStreak, unit: "杯" },
    { label: "のびて下げられた丼", value: result.discardedCount, unit: "杯" },
    { label: "替え玉", value: result.kaedamaCount, unit: "回" },
    { label: "正しく打ったキー数", value: result.correctKeyCount, unit: "回" },
    { label: "ミスタイプ数", value: result.missCount, unit: "回" },
    {
      label: "正確率",
      value: result.accuracy * 100,
      unit: "%",
      digits: 1,
    },
    {
      label: "平均打鍵数",
      value: result.keysPerSecond,
      unit: "回/秒",
      digits: 1,
    },
  ];

  /** 成績の行 index 番目に付ける、上から順に現れる動き */
  const rowReveal = (index: number) =>
    isRevealing
      ? {
          className: "motion-safe:animate-receipt-row-in",
          style: revealTiming(
            receiptRowStartSeconds(index),
            RECEIPT_ROW_IN_SECONDS,
          ),
        }
      : { className: "", style: undefined };
  /** 段取りの start 秒から始まる動き。演出を終えたら付けない */
  const revealAnimation = (
    animation: string,
    start: number,
    duration: number,
  ) =>
    isRevealing
      ? { className: animation, style: revealTiming(start, duration) }
      : { className: "", style: undefined };

  const countedRowText = (row: CountedRow, index: number) => {
    const format = (value: number) =>
      `${value.toFixed(row.digits ?? 0)} ${row.unit}`;
    // 食券とトッピングの 2 行のあとに並ぶ
    const shown = countUpValue(
      row.value,
      elapsedSeconds,
      receiptRowStartSeconds(index + 2),
      RECEIPT_ROW_COUNT_SECONDS,
      row.digits,
    );
    return (
      <CountUpText
        shown={format(shown)}
        final={format(row.value)}
        isRevealing={isRevealing}
      />
    );
  };

  const formatBill = (bill: number) => `${bill.toLocaleString("ja-JP")} 円`;
  const shownBill = countUpValue(
    result.bill,
    elapsedSeconds,
    RESULT_REVEAL.billStart,
    BILL_COUNT_SECONDS,
  );

  const balanceReveal = revealAnimation(
    "origin-right motion-safe:animate-balance-pop",
    RESULT_REVEAL.balanceStart,
    BALANCE_POP_SECONDS,
  );
  const stampReveal = revealAnimation(
    "motion-safe:animate-stamp-press",
    RESULT_REVEAL.stampStart,
    STAMP_PRESS_SECONDS,
  );
  const bubbleReveal = revealAnimation(
    "origin-bottom motion-safe:animate-bubble-in",
    RESULT_REVEAL.stampEnd,
    BUBBLE_IN_SECONDS,
  );
  // 記録の札と行は判子が押されたときに足すので、足したときから動かす
  const recordReveal = revealAnimation(
    "motion-safe:animate-record-pop",
    0,
    RECORD_POP_SECONDS,
  );
  const personalBestReveal = revealAnimation(
    "motion-safe:animate-receipt-row-in",
    0,
    RECEIPT_ROW_IN_SECONDS,
  );

  return (
    // 効果音の札と看板の文字は最小の大きさ（px）で止まり、狭い舞台では舞台の幅ほど縮まない。
    // そこで看板の上端は「効果音の札の下端」、吹き出しの上端は「看板の下端」より下に来るよう、
    // 札と看板の寸法（SoundToggle / StageSign / GameStage の corner）から計算した値を下限にする。
    // 幅 960px（いちばん大きい舞台）では % の値のほうが大きいので、位置は変わらない
    // - 札の下端 + 隙間: 置き場所 1.5cqw + 上下の余白 0.6cqw + 影 0.3cqw + 隙間 0.5cqw + 上下の枠 + 文字の行の高さ
    // 演出の途中でこの画面をクリックすると、演出を飛ばす（useResultReveal）
    <section
      ref={sectionRef}
      className="absolute inset-0 [--sign-top:max(9.5%,calc(2.9cqw+max(4px,0.5cqw)+1.5*max(11px,1.25cqw)))]"
    >
      {/* 伝票と札が読みやすいよう、屋台の絵を夜の色で少し沈める */}
      <YataiScene
        shopkeeperMood={hasStamped ? reaction.mood : "normal"}
        isShopkeeperCheering={isRevealing && hasStamped && reaction.isCheering}
      />
      <div aria-hidden="true" className="absolute inset-0 bg-yatai-night/45" />

      {/* 屋台の屋根に載せた看板。右上の効果音の札と重ならないよう、その下・吹き出しの上に置く。
          吹き出しの位置は看板を 1 行として計算しているので、狭い舞台で幅が足りなくても折り返さない */}
      <div className="absolute top-(--sign-top) left-[60%] flex w-[36%] justify-center [&>h1]:whitespace-nowrap">
        <StageSign />
      </div>

      {/* お会計の伝票 */}
      <div className="absolute top-[4%] left-[19%] flex h-[92%] w-[38%] flex-col stage-paper px-[2.2cqw] py-[1.4cqw]">
        <div className="flex items-start justify-between gap-[1cqw]">
          {/* 判子がいちばん長い称号（7 文字）でも、見出しを折り返さずに並べられる大きさにしている */}
          <div className="whitespace-nowrap">
            <h2 className="font-display text-[3cqw] leading-tight tracking-[0.2em]">
              御会計
            </h2>
            <p className="text-[1.25cqw]">本日は閉店しました</p>
          </div>

          {/* 称号の判子: 伝票の右上に、朱肉で斜めに大きく押す。差し引きが出たあとに押す。
              押す動きは傾き（rotate）と別の transform で付ける */}
          <div
            style={stampReveal.style}
            className={`mt-[0.4cqw] mr-[0.4cqw] flex shrink-0 rotate-[-8deg] flex-col items-center rounded-[0.8cqw] border-[0.45cqw] border-double border-yatai-lantern-dark px-[1cqw] py-[0.4cqw] text-yatai-lantern-dark opacity-90 mix-blend-multiply ${stampReveal.className}`}
          >
            <span className="text-[1.25cqw] leading-tight font-bold">称号</span>
            <span className="font-display text-[2.2cqw] leading-tight whitespace-nowrap">
              {title.name}
            </span>
          </div>
        </div>

        {/* 主役のお会計と差し引き: 見出しのすぐ下に大きく書く。お会計は成績の行のあとに数え上げ、差し引きを弾ませて出す */}
        <dl className="mt-[1.2cqw] grid grid-cols-[auto_1fr] items-baseline gap-x-[1cqw] border-y-[0.25cqw] border-double border-yatai-sumi py-[0.4cqw]">
          <dt className="text-[1.6cqw] font-bold">お会計</dt>
          <dd className="text-right font-display text-[3.8cqw] leading-tight tabular-nums">
            <CountUpText
              shown={formatBill(shownBill)}
              final={formatBill(result.bill)}
              isRevealing={isRevealing}
            />
          </dd>
          <dt className="text-[1.6cqw] font-bold">差し引き</dt>
          <dd
            style={balanceReveal.style}
            className={`text-right font-display text-[3.8cqw] leading-tight ${balanceColor(balance)} ${balanceReveal.className}`}
          >
            {formatBalance(balance)}
          </dd>
        </dl>

        {/* ほかの成績は、小さな文字の 1 つの表にまとめる。長い値（食券・トッピング・打ち間違いの多いキー）は 1 行を使い、残りは 2 列に並べる */}
        <dl className="mt-[1cqw] grid grid-cols-[1fr_auto_1fr_auto] gap-x-[1.5cqw] text-[1.25cqw] whitespace-nowrap">
          <RevealRow className={RECEIPT_FULL_ROW} reveal={rowReveal(0)}>
            <dt>食券</dt>
            <dd className="text-right font-bold tabular-nums">
              {course.name}（{course.price.toLocaleString("ja-JP")} 円）
            </dd>
          </RevealRow>
          <RevealRow className={RECEIPT_FULL_ROW} reveal={rowReveal(1)}>
            <dt>トッピング</dt>
            <dd className="text-right font-bold">
              {names.length === 0 ? "なし" : names.join("・")}
            </dd>
          </RevealRow>
          {countedRows.map((row, index) => (
            <RevealRow
              key={row.label}
              className={RECEIPT_HALF_ROW}
              reveal={rowReveal(index + 2)}
            >
              <dt>{row.label}</dt>
              <dd className="text-right font-bold tabular-nums">
                {countedRowText(row, index)}
              </dd>
            </RevealRow>
          ))}
          <RevealRow
            className={RECEIPT_FULL_ROW}
            reveal={rowReveal(countedRows.length + 2)}
          >
            <dt>打ち間違いの多いキー</dt>
            <dd className="flex justify-end font-bold">
              {missedKeys.length === 0 ? (
                <span className="text-yatai-lantern-dark">打ち間違いなし</span>
              ) : (
                <ol className="flex gap-x-[1cqw]">
                  {missedKeys.map(({ key, count }) => (
                    <li key={key} className="flex items-center gap-x-[0.3cqw]">
                      <kbd className="min-w-[1.8cqw] rounded-[0.3cqw] border-[0.12cqw] border-yatai-sumi bg-white/60 px-[0.3cqw] text-center font-mono leading-snug">
                        {key.toUpperCase()}
                      </kbd>
                      <span>{count} 回</span>
                    </li>
                  ))}
                </ol>
              )}
            </dd>
          </RevealRow>
        </dl>

        {/* 記録は表示のあとに済むので、出たときに読み上げる。伝票の下端に寄せる。
            読み上げが判子より先に始まらないよう、中身は判子が押されてから足す（演出を飛ばしたときと動きを抑えるときはすぐ足す） */}
        <div
          aria-live="polite"
          className="mt-auto border-t-[0.12cqw] border-dashed border-yatai-sumi pt-[0.5cqw] text-right text-[1.3cqw] font-bold"
        >
          {hasStamped && personalBest?.isUpdated && (
            // 伝票の左に立てるのぼり。伝票（位置の基準）からはみ出して置く。判子が押されたあとに弾んで出る
            <p
              style={recordReveal.style}
              className={`absolute top-[6%] right-[calc(100%+3cqw)] flex h-[70%] w-[6.5cqw] flex-col items-center gap-[1cqw] bg-yatai-amber py-[1.2cqw] text-yatai-sumi shadow-[0_0.2cqw_0.8cqw_rgb(0_0_0/0.3)] ${recordReveal.className}`}
            >
              <span className="font-display text-[3.4cqw] leading-none [writing-mode:vertical-rl]">
                新記録
              </span>
              <span className="text-[1.3cqw] leading-tight [writing-mode:vertical-rl]">
                自己ベスト更新！
              </span>
            </p>
          )}
          {/* 自己ベストの行は差し引きの値を明かすので、判子が押されたあとに出す */}
          {hasStamped && personalBest && (
            <p
              style={personalBestReveal.style}
              className={personalBestReveal.className}
            >
              {course.name}の自己ベスト:{" "}
              <span className={balanceColor(personalBest.best)}>
                {formatBalance(personalBest.best)}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* 店主のひとこと: 頭の上の吹き出し。判子が押されたあとに出す。
          看板の下端（文字の行の高さ + 上下の余白 1.6cqw + 上下の枠 0.8cqw）に隙間 0.5cqw をあけて置く */}
      <div
        style={bubbleReveal.style}
        className={`absolute top-[max(22%,calc(var(--sign-top)+1.25*max(20px,3.2cqw)+2.9cqw))] left-[61%] w-[35%] rounded-[1.2cqw] bg-yatai-kinari px-[1.4cqw] py-[0.8cqw] text-yatai-sumi shadow-[0_0.2cqw_0.8cqw_rgb(0_0_0/0.3)] ${bubbleReveal.className}`}
      >
        <p className="text-[1.25cqw]">店主</p>
        <p className="text-[1.6cqw] leading-snug font-bold">
          「{title.remark}」
        </p>
        {/* 三角: 店主の頭の真上にはのれんが下がっているので、のれんと右の提灯のあいだを通して、
            右上から店主の顔を指す。先はのれんの下端（揺れて右に寄ったときも含む）より下、頭の右上に置き、
            延長線が口のあたりに向かうよう傾ける */}
        <span
          aria-hidden="true"
          className="absolute -bottom-[8.3cqw] left-[14.6cqw] h-[8.4cqw] w-[6.4cqw] bg-yatai-kinari [clip-path:polygon(66%_0,100%_0,0_100%)]"
        />
      </div>

      {/* 自己ベストを更新したら、判子が押されたあとに紙吹雪を舞わせる。飾りなので、演出を飛ばしたら出さない */}
      {isRevealing && personalBest?.isUpdated && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          {CONFETTI.map(([left, color, drop, spin, delay]) => (
            <div
              key={left}
              style={
                {
                  left: `${left}%`,
                  "--confetti-drop": `${drop}cqw`,
                  "--confetti-spin": `${spin}deg`,
                  ...revealTiming(
                    RESULT_REVEAL.stampEnd + delay * CONFETTI_MAX_DELAY_SECONDS,
                    CONFETTI_FALL_SECONDS,
                  ),
                } as CSSProperties
              }
              className={`absolute top-[2%] h-[1.4cqw] w-[0.8cqw] opacity-0 ${CONFETTI_COLORS[color]} motion-safe:animate-confetti-fall`}
            />
          ))}
        </div>
      )}

      {/* もう一杯と X で共有: カウンターに並べて置いた木札のボタン。吹き出しと同じ幅に収める。演出の途中でも押せる */}
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

type RevealRowProps = {
  className: string;
  reveal: { className: string; style: CSSProperties | undefined };
  children: ReactNode;
};

/** 伝票の成績の表の 1 行。演出の中では、上から順に現れる */
function RevealRow({ className, reveal, children }: RevealRowProps) {
  return (
    <div style={reveal.style} className={`${className} ${reveal.className}`}>
      {children}
    </div>
  );
}
