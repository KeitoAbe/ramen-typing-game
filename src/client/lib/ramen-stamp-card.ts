import { type Course, courseBalance } from "@/client/lib/ramen-course";
import type { PersonalBestStorage } from "@/client/lib/ramen-personal-best";
import type { PlayResult } from "@/client/lib/ramen-result";
import { decideTitle } from "@/client/lib/ramen-title";

/** スタンプカードを保存する localStorage のキー */
export const STAMP_CARD_STORAGE_KEY = "ramen-game:stamp-card";

/** 「打ち間違いなし」「一杯も無駄にしない」に要る杯数（この値を含む） */
const CLEAN_PLAY_MIN_SERVED = 10;
/** 「替え玉の達人」に要る 1 プレイの替え玉の回数（この値を含む） */
const KAEDAMA_MASTER_MIN_COUNT = 5;
/** 「常連の証」に要る累計の杯数（この値を含む） */
const REGULAR_MIN_TOTAL_SERVED = 100;

/** 1 プレイの成績と、そのプレイを含めた累計の杯数 */
type StampPlay = {
  course: Course;
  result: PlayResult;
  totalServedCount: number;
};

/** スタンプカードに並べる判子（実績） */
export type Stamp = {
  id:
    | "first-bowl"
    | "nami-cleared"
    | "oomori-cleared"
    | "tokumori-cleared"
    | "no-miss"
    | "kaedama-master"
    | "no-waste"
    | "regular"
    | "legend";
  name: string;
  /** 押す条件の説明。まだ押していない枠に出す */
  condition: string;
  isAchieved: (play: StampPlay) => boolean;
};

/** コースで食券代の元を取ったか（差し引きが 0 円以上） */
function clearedCourse(courseId: Course["id"]) {
  return ({ course, result }: StampPlay) =>
    course.id === courseId && courseBalance(result.bill, course) >= 0;
}

// スタンプカードに並べる順
export const STAMPS: readonly Stamp[] = [
  {
    id: "first-bowl",
    name: "はじめての一杯",
    condition: "はじめてプレイを終える",
    isAchieved: () => true,
  },
  {
    id: "nami-cleared",
    name: "並を平らげた",
    condition: "並で食券代の元を取る",
    isAchieved: clearedCourse("nami"),
  },
  {
    id: "oomori-cleared",
    name: "大盛りを平らげた",
    condition: "大盛りで食券代の元を取る",
    isAchieved: clearedCourse("oomori"),
  },
  {
    id: "tokumori-cleared",
    name: "特盛りを平らげた",
    condition: "特盛りで食券代の元を取る",
    isAchieved: clearedCourse("tokumori"),
  },
  {
    id: "no-miss",
    name: "打ち間違いなし",
    condition: `ミスタイプ 0 回で ${CLEAN_PLAY_MIN_SERVED} 杯以上平らげる`,
    isAchieved: ({ result }) =>
      result.missCount === 0 && result.servedCount >= CLEAN_PLAY_MIN_SERVED,
  },
  {
    id: "kaedama-master",
    name: "替え玉の達人",
    condition: `1 プレイで替え玉を ${KAEDAMA_MASTER_MIN_COUNT} 回以上する`,
    isAchieved: ({ result }) => result.kaedamaCount >= KAEDAMA_MASTER_MIN_COUNT,
  },
  {
    id: "no-waste",
    name: "一杯も無駄にしない",
    condition: `丼を 1 杯も下げられずに ${CLEAN_PLAY_MIN_SERVED} 杯以上平らげる`,
    isAchieved: ({ result }) =>
      result.discardedCount === 0 &&
      result.servedCount >= CLEAN_PLAY_MIN_SERVED,
  },
  {
    id: "regular",
    name: "常連の証",
    condition: `累計 ${REGULAR_MIN_TOTAL_SERVED} 杯平らげる`,
    isAchieved: ({ totalServedCount }) =>
      totalServedCount >= REGULAR_MIN_TOTAL_SERVED,
  },
  {
    id: "legend",
    name: "屋台の伝説",
    condition: "称号「屋台の伝説」を取る",
    isAchieved: ({ course, result }) =>
      decideTitle(result, course).id === "legend",
  },
];

/** ブラウザに保存するスタンプカードの中身 */
export type StampCard = {
  /** 押した判子。STAMPS の順に並べる */
  stampedIds: Stamp["id"][];
  /** プレイをまたいだ累計の杯数 */
  totalServedCount: number;
};

export const emptyStampCard: StampCard = {
  stampedIds: [],
  totalServedCount: 0,
};

export type StampCardRecord = {
  /** このプレイを含めたスタンプカード */
  card: StampCard;
  /** このプレイで新しく押した判子。STAMPS の順に並べる */
  newStamps: Stamp[];
};

/** 判子を STAMPS の順に並べ直す */
function sortStampIds(ids: ReadonlySet<Stamp["id"]>): Stamp["id"][] {
  return STAMPS.filter(({ id }) => ids.has(id)).map(({ id }) => id);
}

/** プレイの成績で判子を押す。一度押した判子は、その後の成績で消えない */
export function stampPlay(
  card: StampCard,
  course: Course,
  result: PlayResult,
): StampCardRecord {
  const play: StampPlay = {
    course,
    result,
    totalServedCount: card.totalServedCount + result.servedCount,
  };
  const stamped = new Set(card.stampedIds);
  const newStamps = STAMPS.filter(
    (stamp) => !stamped.has(stamp.id) && stamp.isAchieved(play),
  );
  for (const { id } of newStamps) stamped.add(id);
  return {
    card: {
      stampedIds: sortStampIds(stamped),
      totalServedCount: play.totalServedCount,
    },
    newStamps,
  };
}

/** 保存されていた文字列を読む。壊れている値や知らない判子は無視する */
export function parseStampCard(raw: string | null): StampCard {
  if (raw === null) return emptyStampCard;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return emptyStampCard;
  }
  if (typeof parsed !== "object" || parsed === null) return emptyStampCard;
  const { stampedIds, totalServedCount } = parsed as Record<string, unknown>;
  const knownIds = new Set<string>(STAMPS.map(({ id }) => id));
  const ids = new Set<Stamp["id"]>();
  if (Array.isArray(stampedIds)) {
    for (const id of stampedIds) {
      if (typeof id === "string" && knownIds.has(id)) {
        ids.add(id as Stamp["id"]);
      }
    }
  }
  return {
    stampedIds: sortStampIds(ids),
    totalServedCount:
      typeof totalServedCount === "number" &&
      Number.isFinite(totalServedCount) &&
      totalServedCount >= 0
        ? Math.floor(totalServedCount)
        : 0,
  };
}

/**
 * 保存されたスタンプカードを読む。
 * プライベートブラウズなどで読めなくても例外は投げず、まだ何も押していないものとして扱う
 */
export function loadStampCard(
  storage: PersonalBestStorage | undefined,
): StampCard {
  try {
    return parseStampCard(storage?.getItem(STAMP_CARD_STORAGE_KEY) ?? null);
  } catch {
    return emptyStampCard;
  }
}

/** 2 枚のカードを合わせる。判子は両方の和、累計の杯数は大きいほうをとる */
function mergeStampCards(a: StampCard, b: StampCard): StampCard {
  return {
    stampedIds: sortStampIds(new Set([...a.stampedIds, ...b.stampedIds])),
    totalServedCount: Math.max(a.totalServedCount, b.totalServedCount),
  };
}

/**
 * プレイの成績で判子を押し、累計の杯数とあわせて保存する。
 * 読み書きに失敗しても例外は投げない（自己ベストの保存と同じ扱い）
 */
export function recordStampCard(
  storage: PersonalBestStorage | undefined,
  /** 画面が持っているカード。保存できない環境でも、同じ画面で押した判子と累計を引き継ぐ */
  currentCard: StampCard,
  course: Course,
  result: PlayResult,
): StampCardRecord {
  let stored = emptyStampCard;
  // 読めなかったときに書き込むと、押した判子を消してしまうので書き込まない
  let canWrite = true;
  try {
    stored = parseStampCard(storage?.getItem(STAMP_CARD_STORAGE_KEY) ?? null);
  } catch {
    canWrite = false;
  }
  const record = stampPlay(
    mergeStampCards(stored, currentCard),
    course,
    result,
  );
  if (canWrite) {
    try {
      storage?.setItem(STAMP_CARD_STORAGE_KEY, JSON.stringify(record.card));
    } catch {
      // 保存できなくてもゲームは続けられるので、何もしない
    }
  }
  return record;
}
