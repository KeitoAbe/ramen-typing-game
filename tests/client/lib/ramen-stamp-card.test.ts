import { COURSES, type Course } from "@/client/lib/ramen-course";
import type { PersonalBestStorage } from "@/client/lib/ramen-personal-best";
import { type PlayResult, summarizePlay } from "@/client/lib/ramen-result";
import {
  emptyStampCard,
  loadStampCard,
  parseStampCard,
  recordStampCard,
  STAMP_CARD_STORAGE_KEY,
  STAMPS,
  type StampCard,
  stampPlay,
} from "@/client/lib/ramen-stamp-card";

function course(id: Course["id"]): Course {
  const found = COURSES.find((c) => c.id === id);
  if (!found) throw new Error(`unknown course: ${id}`);
  return found;
}

/** 元を取れず、ミスも下げられた丼もある、どの判子にも届かない成績 */
function play(overrides: Partial<PlayResult> = {}): PlayResult {
  return {
    ...summarizePlay(
      {
        servedCount: 3,
        discardedCount: 1,
        bill: 1_000,
        correctKeyCount: 50,
        missCount: 5,
        kaedamaCount: 0,
        specialServedCount: 0,
      },
      60_000,
    ),
    ...overrides,
  };
}

function newStampIds(
  card: StampCard,
  courseId: Course["id"],
  result: PlayResult,
) {
  return stampPlay(card, course(courseId), result).newStamps.map(
    ({ id }) => id,
  );
}

/** はじめての一杯を押し済みのカード */
const playedCard: StampCard = {
  stampedIds: ["first-bowl"],
  totalServedCount: 3,
};

function memoryStorage(initial?: string): PersonalBestStorage & {
  saved: () => string | null;
} {
  let value: string | null = initial ?? null;
  return {
    getItem: (key) => (key === STAMP_CARD_STORAGE_KEY ? value : null),
    setItem: (key, next) => {
      if (key === STAMP_CARD_STORAGE_KEY) value = next;
    },
    saved: () => value,
  };
}

describe("stampPlay", () => {
  it("はじめてプレイを終えると「はじめての一杯」を押す", () => {
    expect(newStampIds(emptyStampCard, "nami", play())).toEqual(["first-bowl"]);
  });

  it.each([
    ["nami", "nami-cleared", 3_000],
    ["oomori", "oomori-cleared", 5_000],
    ["tokumori", "tokumori-cleared", 10_000],
  ] as const)("%s で差し引きが 0 円以上なら %s を押す", (courseId, stampId, bill) => {
    expect(newStampIds(playedCard, courseId, play({ bill }))).toEqual([
      stampId,
    ]);
    expect(newStampIds(playedCard, courseId, play({ bill: bill - 1 }))).toEqual(
      [],
    );
  });

  it("ミスタイプ 0 回で 10 杯以上平らげると「打ち間違いなし」を押す", () => {
    expect(
      newStampIds(playedCard, "nami", play({ missCount: 0, servedCount: 10 })),
    ).toContain("no-miss");
    expect(
      newStampIds(playedCard, "nami", play({ missCount: 0, servedCount: 9 })),
    ).not.toContain("no-miss");
    expect(
      newStampIds(playedCard, "nami", play({ missCount: 1, servedCount: 10 })),
    ).not.toContain("no-miss");
  });

  it("1 プレイで替え玉を 5 回以上すると「替え玉の達人」を押す", () => {
    expect(newStampIds(playedCard, "nami", play({ kaedamaCount: 5 }))).toEqual([
      "kaedama-master",
    ]);
    expect(newStampIds(playedCard, "nami", play({ kaedamaCount: 4 }))).toEqual(
      [],
    );
  });

  it("丼を 1 杯も下げられずに 10 杯以上平らげると「一杯も無駄にしない」を押す", () => {
    expect(
      newStampIds(
        playedCard,
        "nami",
        play({ discardedCount: 0, servedCount: 10 }),
      ),
    ).toContain("no-waste");
    expect(
      newStampIds(
        playedCard,
        "nami",
        play({ discardedCount: 0, servedCount: 9 }),
      ),
    ).not.toContain("no-waste");
    expect(
      newStampIds(
        playedCard,
        "nami",
        play({ discardedCount: 1, servedCount: 10 }),
      ),
    ).not.toContain("no-waste");
  });

  it("プレイをまたいで累計 100 杯平らげると「常連の証」を押す", () => {
    const card: StampCard = {
      stampedIds: ["first-bowl"],
      totalServedCount: 97,
    };
    expect(newStampIds(card, "nami", play({ servedCount: 2 }))).toEqual([]);
    const record = stampPlay(card, course("nami"), play({ servedCount: 3 }));
    expect(record.newStamps.map(({ id }) => id)).toEqual(["regular"]);
    expect(record.card.totalServedCount).toBe(100);
  });

  it("称号「屋台の伝説」を取ると「屋台の伝説」を押す", () => {
    // 特盛りで食券代の 3 倍お得、正確率 97% 以上で屋台の伝説になる
    const legend = play({ bill: 40_000, accuracy: 0.97 });
    expect(newStampIds(playedCard, "tokumori", legend)).toEqual([
      "tokumori-cleared",
      "legend",
    ]);
    expect(
      newStampIds(playedCard, "tokumori", { ...legend, accuracy: 0.96 }),
    ).not.toContain("legend");
  });

  it("一度押した判子は、その後の成績で消えず、新しく押したとはみなさない", () => {
    const card: StampCard = {
      stampedIds: ["first-bowl", "nami-cleared"],
      totalServedCount: 10,
    };
    const record = stampPlay(card, course("nami"), play({ kaedamaCount: 5 }));
    expect(record.newStamps.map(({ id }) => id)).toEqual(["kaedama-master"]);
    expect(record.card).toEqual({
      stampedIds: ["first-bowl", "nami-cleared", "kaedama-master"],
      totalServedCount: 13,
    });
  });

  it("どの判子にも、押す条件の説明がある", () => {
    for (const stamp of STAMPS) {
      expect(stamp.condition).not.toBe("");
    }
  });
});

describe("parseStampCard", () => {
  it("押した判子と累計の杯数を読み、判子はカードの順に並べる", () => {
    expect(
      parseStampCard(
        '{"stampedIds":["legend","first-bowl"],"totalServedCount":42}',
      ),
    ).toEqual({ stampedIds: ["first-bowl", "legend"], totalServedCount: 42 });
  });

  it.each([
    ["保存されていない", null],
    ["JSON でない", "{broken"],
    ["オブジェクトでない", "123"],
    ["null", "null"],
  ])("%s値は空のカードとして扱う", (_, raw) => {
    expect(parseStampCard(raw)).toEqual(emptyStampCard);
  });

  it("知らない判子や、数でない・負の累計は無視する", () => {
    expect(
      parseStampCard(
        '{"stampedIds":["first-bowl","unknown",3],"totalServedCount":-5}',
      ),
    ).toEqual({ stampedIds: ["first-bowl"], totalServedCount: 0 });
    expect(
      parseStampCard('{"stampedIds":"first-bowl","totalServedCount":"10"}'),
    ).toEqual(emptyStampCard);
  });
});

describe("loadStampCard", () => {
  it("保存されたスタンプカードを読む", () => {
    const storage = memoryStorage(
      '{"stampedIds":["first-bowl"],"totalServedCount":5}',
    );
    expect(loadStampCard(storage)).toEqual({
      stampedIds: ["first-bowl"],
      totalServedCount: 5,
    });
  });

  it("保存先が無い・読めないときは空のカードとして扱う", () => {
    expect(loadStampCard(undefined)).toEqual(emptyStampCard);
    expect(
      loadStampCard({
        getItem: () => {
          throw new Error("SecurityError");
        },
        setItem: () => {},
      }),
    ).toEqual(emptyStampCard);
  });
});

describe("recordStampCard", () => {
  it("押した判子と累計の杯数を保存し、再読み込みしても残る", () => {
    const storage = memoryStorage();
    const first = recordStampCard(storage, course("nami"), play());
    expect(first.newStamps.map(({ id }) => id)).toEqual(["first-bowl"]);
    expect(loadStampCard(storage)).toEqual({
      stampedIds: ["first-bowl"],
      totalServedCount: 3,
    });

    const second = recordStampCard(
      storage,
      course("nami"),
      play({ bill: 3_000 }),
    );
    expect(second.newStamps.map(({ id }) => id)).toEqual(["nami-cleared"]);
    expect(loadStampCard(storage)).toEqual({
      stampedIds: ["first-bowl", "nami-cleared"],
      totalServedCount: 6,
    });
  });

  it("保存先が無くても例外を投げない", () => {
    expect(
      recordStampCard(undefined, course("nami"), play()).newStamps.map(
        ({ id }) => id,
      ),
    ).toEqual(["first-bowl"]);
  });

  it("読み取りに失敗したときは、保存済みのカードを上書きしない", () => {
    const setItem = jest.fn();
    const storage: PersonalBestStorage = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem,
    };
    recordStampCard(storage, course("nami"), play());
    expect(setItem).not.toHaveBeenCalled();
  });

  it("書き込みで例外が出ても、判子は押したものとして続ける", () => {
    const storage: PersonalBestStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    expect(
      recordStampCard(storage, course("nami"), play()).card.stampedIds,
    ).toEqual(["first-bowl"]);
  });
});
