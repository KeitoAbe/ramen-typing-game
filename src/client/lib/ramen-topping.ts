/** 食券のあとに足せるトッピング。難しくなる代わりに丼が高く売れる */
export type ToppingId = "gekikara" | "ninniku";

export type Topping = {
  id: ToppingId;
  name: string;
  /** 選ぶ画面に出す、難しくなる中身。小さな券に値段の倍率と並べて 1 行で載せるので、短く書く */
  effect: string;
};

/** トッピングを付けたプレイで平らげた丼の値段の倍率（トッピング 1 つあたり） */
export const TOPPING_PRICE_RATE = 1.3;
/** 激辛でミスタイプするたびに減る残り時間（ミリ秒） */
export const GEKIKARA_MISS_PENALTY_MS = 1_000;
/** ニンニクマシマシで、どの丼にもかける、のびきるまでの時間の倍率 */
export const NINNIKU_SOGGY_RATE = 0.7;

export const TOPPINGS: readonly Topping[] = [
  {
    id: "gekikara",
    name: "激辛",
    effect: `ミスで −${GEKIKARA_MISS_PENALTY_MS / 1000} 秒`,
  },
  {
    id: "ninniku",
    name: "ニンニクマシマシ",
    effect: `のびる時間 ×${NINNIKU_SOGGY_RATE}`,
  },
];

/** 選んだトッピングを、選ぶ画面と同じ順に並べた名前（なければ空） */
export function toppingNames(toppings: readonly ToppingId[]): string[] {
  return TOPPINGS.filter((topping) => toppings.includes(topping.id)).map(
    (topping) => topping.name,
  );
}

/** 平らげた丼の値段にかける倍率。トッピングごとに TOPPING_PRICE_RATE を掛け合わせる */
export function toppingPriceRate(toppings: readonly ToppingId[]): number {
  return TOPPINGS.reduce(
    (rate, topping) =>
      toppings.includes(topping.id) ? rate * TOPPING_PRICE_RATE : rate,
    1,
  );
}

/** ミスタイプ 1 回で減る残り時間（ミリ秒）。激辛でなければ 0 */
export function toppingMissPenaltyMs(toppings: readonly ToppingId[]): number {
  return toppings.includes("gekikara") ? GEKIKARA_MISS_PENALTY_MS : 0;
}

/** 丼がのびきるまでの時間を、トッピングに合わせて決める */
export function toppingSoggyLimitMs(
  baseLimitMs: number,
  toppings: readonly ToppingId[],
): number {
  return toppings.includes("ninniku")
    ? baseLimitMs * NINNIKU_SOGGY_RATE
    : baseLimitMs;
}
