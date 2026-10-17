import { COURSES, type Course } from "@/client/lib/ramen-course";

/** 自己ベストを保存する localStorage のキー */
export const PERSONAL_BEST_STORAGE_KEY = "ramen-game:personal-bests";

/** コースごとの自己ベスト（最高のお得額、円）。まだ遊んでいないコースは持たない */
export type PersonalBests = Partial<Record<Course["id"], number>>;

/** 保存先。テストで差し替えられるよう、使うメソッドだけに絞る */
export type PersonalBestStorage = Pick<Storage, "getItem" | "setItem">;

export type PersonalBestRecord = {
  /** このプレイを含めた自己ベスト（お得額、円） */
  best: number;
  /** このプレイで自己ベストを更新したか。そのコースを初めて遊んだときも更新とみなす */
  isUpdated: boolean;
};

/** 今回のお得額を、それまでの自己ベストと比べる。同額は更新とみなさない */
export function compareWithPersonalBest(
  balance: number,
  previousBest: number | undefined,
): PersonalBestRecord {
  if (previousBest === undefined || balance > previousBest) {
    return { best: balance, isUpdated: true };
  }
  return { best: previousBest, isUpdated: false };
}

/** 保存されていた文字列を読む。壊れている値や知らないコースは無視する */
export function parsePersonalBests(raw: string | null): PersonalBests {
  if (raw === null) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (typeof parsed !== "object" || parsed === null) return {};
  const bests: PersonalBests = {};
  for (const { id } of COURSES) {
    const value = (parsed as Record<string, unknown>)[id];
    if (typeof value === "number" && Number.isFinite(value)) {
      bests[id] = value;
    }
  }
  return bests;
}

/**
 * 今回のお得額で自己ベストを比べ、更新していれば保存する。
 * プライベートブラウズなどで読み書きに失敗しても例外は投げず、記録が無いものとして扱う
 */
export function recordPersonalBest(
  storage: PersonalBestStorage | undefined,
  courseId: Course["id"],
  balance: number,
): PersonalBestRecord {
  let bests: PersonalBests = {};
  // 読めなかったときに書き込むと、ほかのコースの記録を消してしまうので書き込まない
  let canWrite = true;
  try {
    bests = parsePersonalBests(
      storage?.getItem(PERSONAL_BEST_STORAGE_KEY) ?? null,
    );
  } catch {
    // 読めなければ記録が無いものとして扱う
    canWrite = false;
  }
  const record = compareWithPersonalBest(balance, bests[courseId]);
  if (record.isUpdated && canWrite) {
    try {
      storage?.setItem(
        PERSONAL_BEST_STORAGE_KEY,
        JSON.stringify({ ...bests, [courseId]: record.best }),
      );
    } catch {
      // 保存できなくてもゲームは続けられるので、何もしない
    }
  }
  return record;
}

/** ブラウザの localStorage を返す。無効にされていて触るだけで例外になる環境では undefined */
export function browserStorage(): PersonalBestStorage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
