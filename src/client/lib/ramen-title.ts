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
  /**
   * コースごとの、食券代に対するお得額の割合の下限（この値を含む）。
   * 載っていないコースではこの称号を出さない
   */
  minBalanceRates: Readonly<Partial<Record<Course["id"], number>>>;
  /** 正確率の下限（この値を含む） */
  minAccuracy: number;
};

// 上の称号から順に並べ、最初に条件を満たしたものを出す。
// お得額は食券代に対する割合で見るが、特別な丼・連続杯数・閉店間際・替え玉はうまい人ほど重なって効き、
// その効き方が制限時間や問題の長さで変わるので、割合の下限はコースごとに決める。
// 下限は、腕前（毎秒の打鍵数と正確率）ごとに実際のゲームの進み方で遊んだお会計から決めていて、
// トッピングの倍率で 2 段以上は上がらないよう、段どうしの間を空けている（tests の ramen-title-balance で確かめる）。
// いちばん上の称号だけは、特盛りを平らげたときの特別な称号にしている
const TITLE_RULES: readonly TitleRule[] = [
  {
    id: "legend",
    name: "屋台の伝説",
    remark: "あんたの名前、のれんに書いておくよ",
    minBalanceRates: { tokumori: 7 },
    minAccuracy: 0.975,
  },
  {
    id: "critic",
    name: "ラーメン評論家",
    remark: "その食べっぷり、記事にしてくれないか",
    minBalanceRates: { nami: 13, oomori: 12, tokumori: 5 },
    minAccuracy: 0.95,
  },
  {
    id: "connoisseur",
    name: "麺通",
    remark: "麺の硬さがわかる顔をしてるね",
    minBalanceRates: { nami: 6, oomori: 5.5, tokumori: 3 },
    minAccuracy: 0.9,
  },
  {
    id: "regular",
    name: "常連さん",
    remark: "毎度あり、また来てくれよ",
    minBalanceRates: { nami: 2, oomori: 2, tokumori: 1 },
    minAccuracy: 0,
  },
  {
    id: "hungry",
    name: "腹ぺこの客",
    remark: "次はもう少しお腹を空かせておいで",
    minBalanceRates: { nami: 0, oomori: 0, tokumori: 0 },
    minAccuracy: 0,
  },
  {
    id: "passerby",
    name: "通りすがりの客",
    remark: "のれんをくぐってくれただけで嬉しいよ",
    minBalanceRates: {
      nami: Number.NEGATIVE_INFINITY,
      oomori: Number.NEGATIVE_INFINITY,
      tokumori: Number.NEGATIVE_INFINITY,
    },
    minAccuracy: 0,
  },
];

/** コースと成績から、結果画面に出す称号を 1 つ決める */
export function decideTitle(result: PlayResult, course: Course): RamenTitle {
  const balanceRate = courseBalance(result.bill, course) / course.price;
  const rule = TITLE_RULES.find((r) => {
    const minBalanceRate = r.minBalanceRates[course.id];
    return (
      minBalanceRate !== undefined &&
      balanceRate >= minBalanceRate &&
      result.accuracy >= r.minAccuracy
    );
  });
  // 最後の規則はどの成績でも満たすので、見つからないことはない
  const { id, name, remark } = rule ?? TITLE_RULES[TITLE_RULES.length - 1];
  return { id, name, remark };
}
