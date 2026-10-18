import type { Course } from "@/client/lib/ramen-course";
import { shuffleOrders } from "@/client/lib/ramen-game";
import {
  compareWithPersonalBest,
  type PersonalBestRecord,
  type PersonalBestStorage,
  parsePersonalBests,
} from "@/client/lib/ramen-personal-best";
import type { Order } from "@/types/order";

/** 遊び方。いつものプレイ（毎回ランダム）か、日付で決まる「今日のお題」か */
export type PlayMode = "regular" | "daily";

/** 今日のお題の最高記録を保存する localStorage のキー */
export const DAILY_BEST_STORAGE_KEY = "ramen-game:daily-bests";

/** 日本時間は UTC より 9 時間進んでいる（夏時間はない） */
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 時刻から、日本時間の日付を「YYYY-MM-DD」の形で返す。お題はこの日付で区切る */
export function dailyDateKey(now: number): string {
  return new Date(now + JST_OFFSET_MS).toISOString().slice(0, 10);
}

/** 「YYYY-MM-DD」の日付を「10月18日」の形で表す */
export function formatDailyDate(dateKey: string): string {
  const [, month, day] = dateKey.split("-");
  return `${Number(month)}月${Number(day)}日`;
}

/** 文字列から 32 ビットの種を作る（FNV-1a） */
function hashString(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** 種から、0 以上 1 未満の乱数を順に返す関数を作る（mulberry32）。同じ種なら同じ並びになる */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 今日のお題の注文の順番。同じ日付・同じコースなら、誰がいつ遊んでも同じ順番になる */
export function dailyOrders(
  orders: readonly Order[],
  dateKey: string,
  courseId: Course["id"],
): Order[] {
  return shuffleOrders(
    orders,
    createSeededRandom(hashString(`${dateKey}:${courseId}:orders`)),
  );
}

/**
 * 今日のお題で、何杯目（0 始まり）の丼を出すときの乱数を返す関数を作る。
 * 丼の順番だけで決まるので、打つ速さやタイマーの刻みが違っても、同じ杯には同じ乱数が出る
 */
export function dailyBowlRoll(
  dateKey: string,
  courseId: Course["id"],
): (bowlIndex: number) => number {
  return (bowlIndex) =>
    createSeededRandom(
      hashString(`${dateKey}:${courseId}:bowl:${bowlIndex}`),
    )();
}

export type DailyBestRecord = PersonalBestRecord & {
  /** どの日のお題の記録か（「YYYY-MM-DD」） */
  dateKey: string;
};

/**
 * 保存されていた文字列から、その日のコースごとの最高記録を読む。別の日の記録や壊れた値は空として扱う。
 * 保存されていたのがその日より新しい日の記録なら isNewerSaved を true にする
 */
function parseDailyBests(
  raw: string | null,
  dateKey: string,
): { bests: ReturnType<typeof parsePersonalBests>; isNewerSaved: boolean } {
  const empty = { bests: {}, isNewerSaved: false };
  if (raw === null) return empty;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return empty;
  }
  if (typeof parsed !== "object" || parsed === null) return empty;
  const { date, bests } = parsed as Record<string, unknown>;
  if (date !== dateKey) {
    // 「YYYY-MM-DD」は文字列のまま比べても日付の前後と一致する
    return {
      bests: {},
      isNewerSaved: typeof date === "string" && date > dateKey,
    };
  }
  return {
    bests: parsePersonalBests(JSON.stringify(bests ?? null)),
    isNewerSaved: false,
  };
}

/**
 * 今日のお題のお得額を、その日・そのコースの最高記録と比べ、更新していれば保存する。
 * 保存するのはその日の記録だけで、日付が変わったら前の日の記録は上書きする。
 * ただし、もっと新しい日の記録が保存されていたら書き込まない
 * （前の日に始めたプレイが、別のタブで遊んだ新しい日のプレイより後に閉店したとき、新しい日の記録を消さないため）。
 * 読み書きに失敗しても例外は投げず、記録が無いものとして扱う
 */
export function recordDailyBest(
  storage: PersonalBestStorage | undefined,
  dateKey: string,
  courseId: Course["id"],
  balance: number,
): DailyBestRecord {
  let bests: ReturnType<typeof parsePersonalBests> = {};
  // 読めなかったときに書き込むと、ほかのコースの記録を消してしまうので書き込まない
  let canWrite = true;
  try {
    const saved = parseDailyBests(
      storage?.getItem(DAILY_BEST_STORAGE_KEY) ?? null,
      dateKey,
    );
    bests = saved.bests;
    canWrite = !saved.isNewerSaved;
  } catch {
    canWrite = false;
  }
  const record = compareWithPersonalBest(balance, bests[courseId]);
  if (record.isUpdated && canWrite) {
    try {
      storage?.setItem(
        DAILY_BEST_STORAGE_KEY,
        JSON.stringify({
          date: dateKey,
          bests: { ...bests, [courseId]: record.best },
        }),
      );
    } catch {
      // 保存できなくてもゲームは続けられるので、何もしない
    }
  }
  return { ...record, dateKey };
}
