import { type Course, courseBalance } from "@/client/lib/ramen-course";
import type { PlayResult } from "@/client/lib/ramen-result";

/** 結果画面に出す称号。下の段から順に上がっていく */
export type RamenTitle = {
  id: "passerby" | "hungry" | "regular" | "connoisseur" | "critic" | "legend";
  name: string;
  /** 店主の一言 */
  remark: string;
};

type TitleRule = RamenTitle & {
  /** 食券代に対するお得額の割合の下限（この値を含む） */
  minBalanceRate: number;
  /** 正確率の下限（この値を含む） */
  minAccuracy: number;
  /** この称号を出せるコース。省略したらどのコースでも出す */
  courseIds?: readonly Course["id"][];
};

// 上の称号から順に並べ、最初に条件を満たしたものを出す。
// お得額は食券代に対する割合で見て、コースの値段の違いをならしている。
// いちばん上の称号だけは、特盛りを平らげたときの特別な称号にしている。
// 食券は食べ放題の札で丼に比べて安いので、元を取ったうえで何倍食べたかで段階をつける
const TITLE_RULES: readonly TitleRule[] = [
  {
    id: "legend",
    name: "屋台の伝説",
    remark: "あんたの名前、のれんに書いておくよ",
    minBalanceRate: 3,
    minAccuracy: 0.97,
    courseIds: ["tokumori"],
  },
  {
    id: "critic",
    name: "ラーメン評論家",
    remark: "その食べっぷり、記事にしてくれないか",
    minBalanceRate: 2.5,
    minAccuracy: 0.95,
  },
  {
    id: "connoisseur",
    name: "麺通",
    remark: "麺の硬さがわかる顔をしてるね",
    minBalanceRate: 1.5,
    minAccuracy: 0.9,
  },
  {
    id: "regular",
    name: "常連さん",
    remark: "毎度あり、また来てくれよ",
    minBalanceRate: 1,
    minAccuracy: 0,
  },
  {
    id: "hungry",
    name: "腹ぺこの客",
    remark: "次はもう少しお腹を空かせておいで",
    minBalanceRate: 0,
    minAccuracy: 0,
  },
  {
    id: "passerby",
    name: "通りすがりの客",
    remark: "のれんをくぐってくれただけで嬉しいよ",
    minBalanceRate: Number.NEGATIVE_INFINITY,
    minAccuracy: 0,
  },
];

/** コースと成績から、結果画面に出す称号を 1 つ決める */
export function decideTitle(result: PlayResult, course: Course): RamenTitle {
  const balanceRate = courseBalance(result.bill, course) / course.price;
  const rule = TITLE_RULES.find(
    (r) =>
      balanceRate >= r.minBalanceRate &&
      result.accuracy >= r.minAccuracy &&
      (r.courseIds === undefined || r.courseIds.includes(course.id)),
  );
  // 最後の規則はどの成績でも満たすので、見つからないことはない
  const { id, name, remark } = rule ?? TITLE_RULES[TITLE_RULES.length - 1];
  return { id, name, remark };
}
