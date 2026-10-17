import {
  compareWithPersonalBest,
  PERSONAL_BEST_STORAGE_KEY,
  type PersonalBestStorage,
  parsePersonalBests,
  recordPersonalBest,
} from "@/client/lib/ramen-personal-best";

function memoryStorage(initial?: string): PersonalBestStorage & {
  saved: () => string | null;
} {
  let value: string | null = initial ?? null;
  return {
    getItem: (key) => (key === PERSONAL_BEST_STORAGE_KEY ? value : null),
    setItem: (key, next) => {
      if (key === PERSONAL_BEST_STORAGE_KEY) value = next;
    },
    saved: () => value,
  };
}

describe("compareWithPersonalBest", () => {
  it("記録が無ければ、今回の成績が自己ベストになり更新とみなす", () => {
    expect(compareWithPersonalBest(-3_000, undefined)).toEqual({
      best: -3_000,
      isUpdated: true,
    });
  });

  it("前の自己ベストを上回れば更新", () => {
    expect(compareWithPersonalBest(1_200, 1_000)).toEqual({
      best: 1_200,
      isUpdated: true,
    });
  });

  it("前の自己ベストと同額なら更新しない", () => {
    expect(compareWithPersonalBest(1_000, 1_000)).toEqual({
      best: 1_000,
      isUpdated: false,
    });
  });

  it("前の自己ベストに届かなければ、自己ベストはそのまま", () => {
    expect(compareWithPersonalBest(-500, 1_000)).toEqual({
      best: 1_000,
      isUpdated: false,
    });
  });
});

describe("parsePersonalBests", () => {
  it("保存されたコースごとの自己ベストを読む", () => {
    expect(parsePersonalBests('{"nami":1200,"tokumori":-500}')).toEqual({
      nami: 1_200,
      tokumori: -500,
    });
  });

  it.each([
    ["保存されていない", null],
    ["JSON でない", "{broken"],
    ["オブジェクトでない", "123"],
    ["null", "null"],
  ])("%s値は空として扱う", (_, raw) => {
    expect(parsePersonalBests(raw)).toEqual({});
  });

  it("数値でない値や知らないコースは無視する", () => {
    expect(
      parsePersonalBests('{"nami":"1200","oomori":800,"kaedama":100}'),
    ).toEqual({ oomori: 800 });
  });
});

describe("recordPersonalBest", () => {
  it("初めて遊んだコースは、更新として保存する", () => {
    const storage = memoryStorage();
    expect(recordPersonalBest(storage, "nami", 500)).toEqual({
      best: 500,
      isUpdated: true,
    });
    expect(parsePersonalBests(storage.saved())).toEqual({ nami: 500 });
  });

  it("更新したコースだけを書き換え、ほかのコースの記録は残す", () => {
    const storage = memoryStorage('{"nami":500,"oomori":800}');
    expect(recordPersonalBest(storage, "nami", 900)).toEqual({
      best: 900,
      isUpdated: true,
    });
    expect(parsePersonalBests(storage.saved())).toEqual({
      nami: 900,
      oomori: 800,
    });
  });

  it("更新しなければ保存し直さない", () => {
    const storage = memoryStorage('{"nami":500}');
    const setItem = jest.spyOn(storage, "setItem");
    expect(recordPersonalBest(storage, "nami", 100)).toEqual({
      best: 500,
      isUpdated: false,
    });
    expect(setItem).not.toHaveBeenCalled();
  });

  it("保存先が無くても例外を投げない", () => {
    expect(recordPersonalBest(undefined, "nami", 100)).toEqual({
      best: 100,
      isUpdated: true,
    });
  });

  it("読み書きで例外が出ても、記録が無いものとして続ける", () => {
    const storage: PersonalBestStorage = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    expect(recordPersonalBest(storage, "tokumori", 100)).toEqual({
      best: 100,
      isUpdated: true,
    });
  });
});
