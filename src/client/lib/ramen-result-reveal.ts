import type { RamenTitle } from "@/client/lib/ramen-title";

// 結果画面の結果発表の演出の段取り（docs/design.md の「結果発表の演出」）。時刻は結果画面が出てからの秒。
// 伝票の成績の行が上から順に現れて数字が数え上がり、最後にお会計を数え上げて、差し引き → 判子 → 店主の吹き出しの順に出す。
// CSS の動きの待ち時間（animation-delay）もここから渡すので、globals.css の @keyframes には長さだけを書く

/** 伝票の成績の表の行の数（食券・トッピング・数字の 9 項目・打ち間違いの多いキー） */
export const RECEIPT_ROW_COUNT = 12;
/** 成績の行が 1 行目から現れ始めるまで */
const RECEIPT_ROWS_START_SECONDS = 0.1;
/** 成績の行を 1 行ずつ遅らせる間 */
const RECEIPT_ROW_STAGGER_SECONDS = 0.05;
/** 成績の行が現れる長さ（globals.css の receipt-row-in） */
export const RECEIPT_ROW_IN_SECONDS = 0.2;
/** 成績の行の数字を 0 から数え上げる長さ */
export const RECEIPT_ROW_COUNT_SECONDS = 0.35;
/** お会計の金額を数え上げる長さ */
export const BILL_COUNT_SECONDS = 0.5;
/** 差し引きが弾んで出る長さ（globals.css の balance-pop） */
export const BALANCE_POP_SECONDS = 0.35;
/** 判子を押す長さ（globals.css の stamp-press）。70% の時点で伝票に着く */
export const STAMP_PRESS_SECONDS = 0.35;
/** 判子を押す動きのうち、伝票に着くまでの割合 */
const STAMP_LANDING_RATE = 0.7;
/** 店主の吹き出しが出る長さ（globals.css の bubble-in） */
export const BUBBLE_IN_SECONDS = 0.25;
/** 店主が跳び上がって喜ぶ長さ（globals.css の shopkeeper-cheer。絵の中の動きなので、長さは CSS に書く） */
const SHOPKEEPER_CHEER_SECONDS = 0.6;
/** 「新記録」の札が弾む長さ（globals.css の record-pop） */
export const RECORD_POP_SECONDS = 0.4;
/** 自己ベスト更新の紙吹雪が舞う長さ（globals.css の confetti-fall） */
export const CONFETTI_FALL_SECONDS = 0.6;
/** 紙吹雪の紙ごとの遅れの最大 */
export const CONFETTI_MAX_DELAY_SECONDS = 0.1;

/** 成績の行 index 番目（0 始まり）が現れ始める時刻 */
export function receiptRowStartSeconds(index: number): number {
  return RECEIPT_ROWS_START_SECONDS + index * RECEIPT_ROW_STAGGER_SECONDS;
}

/** 演出の段取り。どれも結果画面が出てからの秒 */
export type RevealTimeline = {
  /** お会計を数え上げ始める（最後の成績の行が数え終わったとき） */
  billStart: number;
  /** 差し引きが弾んで出始める */
  balanceStart: number;
  /** 判子を押し始める */
  stampStart: number;
  /** 判子が伝票に着く。判子の音はここで鳴らす */
  stampLanding: number;
  /** 判子を押し終える。店主の吹き出し・表情・新記録の札・紙吹雪はここから出す */
  stampEnd: number;
  /** 演出がすべて終わる */
  end: number;
};

/** 成績の行の数から、演出の段取りを決める */
export function revealTimeline(rowCount: number): RevealTimeline {
  const billStart =
    receiptRowStartSeconds(Math.max(rowCount - 1, 0)) +
    RECEIPT_ROW_COUNT_SECONDS;
  const balanceStart = billStart + BILL_COUNT_SECONDS;
  const stampStart = balanceStart + BALANCE_POP_SECONDS;
  const stampEnd = stampStart + STAMP_PRESS_SECONDS;
  return {
    billStart,
    balanceStart,
    stampStart,
    stampLanding: stampStart + STAMP_PRESS_SECONDS * STAMP_LANDING_RATE,
    stampEnd,
    end:
      stampEnd +
      Math.max(
        BUBBLE_IN_SECONDS,
        SHOPKEEPER_CHEER_SECONDS,
        RECORD_POP_SECONDS,
        CONFETTI_MAX_DELAY_SECONDS + CONFETTI_FALL_SECONDS,
      ),
  };
}

/** 結果画面の演出の段取り */
export const RESULT_REVEAL = revealTimeline(RECEIPT_ROW_COUNT);

/**
 * 数え上げている途中の値。start 秒から duration 秒かけて 0 から target まで、終わりにかけてゆっくり上げる。
 * 小数の値（正確率など）は digits 桁で丸めて返す
 */
export function countUpValue(
  target: number,
  elapsedSeconds: number,
  startSeconds: number,
  durationSeconds: number,
  digits = 0,
): number {
  const progress = Math.min(
    Math.max((elapsedSeconds - startSeconds) / durationSeconds, 0),
    1,
  );
  if (progress === 1) return target;
  const eased = 1 - (1 - progress) ** 3;
  const scale = 10 ** digits;
  return Math.floor(target * eased * scale) / scale;
}

/** 店主が結果を見てどう喜ぶか。上の称号ほど喜ぶ */
export type ShopkeeperReaction = {
  mood: "normal" | "happy";
  /** 跳び上がって喜ぶ */
  isCheering: boolean;
};

/**
 * 称号から店主の反応を決める。
 * 下の 2 段は普段の顔のまま、常連さん・麺通は笑顔、評論家・伝説は笑顔で跳び上がる
 */
export function shopkeeperReactionOf(
  titleId: RamenTitle["id"],
): ShopkeeperReaction {
  switch (titleId) {
    case "legend":
    case "critic":
      return { mood: "happy", isCheering: true };
    case "connoisseur":
    case "regular":
      return { mood: "happy", isCheering: false };
    case "hungry":
    case "passerby":
      return { mood: "normal", isCheering: false };
  }
}
