import {
  COURSES,
  type Course,
  ordersForCourse,
} from "@/client/lib/ramen-course";
import {
  initialRamenGameState,
  type RamenGameState,
  ramenGameReducer,
  shuffleOrders,
} from "@/client/lib/ramen-game";
import { type PlayResult, summarizePlay } from "@/client/lib/ramen-result";
import { decideTitle, type RamenTitle } from "@/client/lib/ramen-title";
import type { ToppingId } from "@/client/lib/ramen-topping";
import { remainingRomaji } from "@/client/lib/romaji/typing";
import { STATIC_ORDERS } from "@/server/contexts/order/infrastructure/repositories/static-order-repository";

/** プレイヤーの腕前。打鍵数は正しく打ったキーで数える（結果画面の「毎秒の打鍵数」と同じ） */
type Skill = {
  name: string;
  keysPerSecond: number;
  accuracy: number;
};

const SKILLS = {
  beginner: { name: "初心者", keysPerSecond: 1.5, accuracy: 0.85 },
  average: { name: "平均的", keysPerSecond: 3, accuracy: 0.92 },
  advanced: { name: "上級者", keysPerSecond: 5, accuracy: 0.96 },
  master: { name: "達人", keysPerSecond: 7, accuracy: 0.98 },
} as const satisfies Record<string, Skill>;

/** 称号の段。下の段から順に並べる */
const TITLE_RANKS: readonly RamenTitle["id"][] = [
  "passerby",
  "hungry",
  "regular",
  "connoisseur",
  "critic",
  "legend",
];

const TOPPING_SETS: readonly (readonly ToppingId[])[] = [
  ["gekikara"],
  ["ninniku"],
  ["gekikara", "ninniku"],
];

/** 結果を毎回同じにするための、種を固定した乱数（mulberry32） */
function seededRandom(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** どの注文のつづりにも出てこないので、必ずミスタイプになるキー */
const MISS_KEY = "@";

/**
 * 腕前どおりに打ち続けるプレイヤーで、コースを閉店まで遊ぶ。
 * 実際のゲームと同じ reducer を通すので、丼が出る・のびる・替え玉・閉店間際などはすべて反映される
 */
function play(
  skill: Skill,
  course: Course,
  toppings: readonly ToppingId[] = [],
  seed = 62,
): PlayResult {
  const random = seededRandom(seed);
  // ミスも含めて打つ間隔。正しく打ったキーが毎秒 keysPerSecond になるようにする
  const intervalMs = 1000 / (skill.keysPerSecond / skill.accuracy);
  let now = 0;
  let state: RamenGameState = ramenGameReducer(initialRamenGameState, {
    type: "start",
    course,
    toppings,
    orders: shuffleOrders(ordersForCourse(STATIC_ORDERS, course), random),
    now,
    roll: random(),
  });
  while (state.status === "playing") {
    now += intervalMs;
    state = ramenGameReducer(state, { type: "tick", now, roll: random() });
    if (state.status !== "playing") break;
    const key =
      random() < skill.accuracy
        ? remainingRomaji(state.typing).charAt(0)
        : MISS_KEY;
    state = ramenGameReducer(state, { type: "key", key, now, roll: random() });
  }
  if (state.status !== "closed") throw new Error("閉店していない");
  return summarizePlay(state.stats, state.playedMs);
}

function courseOf(id: Course["id"]): Course {
  const course = COURSES.find((c) => c.id === id);
  if (course === undefined) throw new Error(`${id} のコースがない`);
  return course;
}

function titleOf(
  skill: Skill,
  course: Course,
  toppings: readonly ToppingId[] = [],
): RamenTitle["id"] {
  return decideTitle(play(skill, course, toppings), course).id;
}

const CASES = [
  // 腕前, コース, 出てよい称号
  [SKILLS.beginner, "nami", ["hungry", "passerby"]],
  [SKILLS.beginner, "oomori", ["hungry", "passerby"]],
  [SKILLS.beginner, "tokumori", ["hungry", "passerby"]],
  [SKILLS.average, "nami", ["regular"]],
  [SKILLS.average, "oomori", ["regular"]],
  [SKILLS.average, "tokumori", ["regular"]],
  [SKILLS.advanced, "nami", ["connoisseur", "critic"]],
  [SKILLS.advanced, "oomori", ["connoisseur", "critic"]],
  [SKILLS.advanced, "tokumori", ["connoisseur", "critic"]],
  [SKILLS.master, "nami", ["critic"]],
  [SKILLS.master, "oomori", ["critic"]],
  [SKILLS.master, "tokumori", ["legend"]],
] as const satisfies readonly [
  Skill,
  Course["id"],
  readonly RamenTitle["id"][],
][];

describe("称号の基準（腕前どおりに遊んだときの称号）", () => {
  it("想定した腕前どおりの打鍵数と正確率で遊べている", () => {
    for (const skill of Object.values(SKILLS)) {
      const result = play(skill, courseOf("oomori"));
      expect(result.keysPerSecond).toBeCloseTo(skill.keysPerSecond, 0);
      expect(Math.abs(result.accuracy - skill.accuracy)).toBeLessThan(0.05);
    }
  });

  it.each(
    CASES.map(([skill, courseId, expected]) => [
      skill.name,
      courseId,
      expected.join(" か "),
      skill,
      expected,
    ]),
  )("%s が %s を遊ぶと、称号は %s", (_name, courseId, _label, skill, expected) => {
    expect(expected).toContain(titleOf(skill, courseOf(courseId)));
  });

  it("屋台の伝説は特盛りでしか出ない", () => {
    for (const courseId of ["nami", "oomori"] as const) {
      for (const toppings of [[], ...TOPPING_SETS]) {
        expect(titleOf(SKILLS.master, courseOf(courseId), toppings)).not.toBe(
          "legend",
        );
      }
    }
  });

  it.each(
    CASES.map(([skill, courseId]) => [skill.name, courseId, skill]),
  )("%s が %s をトッピング付きで遊ぶと、付けないときと同じか 1 段上の称号になる", (_name, courseId, skill) => {
    const course = courseOf(courseId);
    const baseRank = TITLE_RANKS.indexOf(titleOf(skill, course));
    for (const toppings of TOPPING_SETS) {
      const rank = TITLE_RANKS.indexOf(titleOf(skill, course, toppings));
      expect(rank - baseRank).toBeGreaterThanOrEqual(0);
      expect(rank - baseRank).toBeLessThanOrEqual(1);
    }
  });
});
