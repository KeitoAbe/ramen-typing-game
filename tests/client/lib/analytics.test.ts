import {
  parseGaMeasurementId,
  playEndParams,
  trackImeNoticeShown,
  trackPlayEnd,
  trackPlayStart,
  trackReplay,
  trackShare,
  trackSoundToggle,
  trackTicketAbandon,
  trackTouchNoticeShown,
} from "@/client/lib/analytics";
import { COURSES } from "@/client/lib/ramen-course";
import { emptyPlayStats, type PlayResult } from "@/client/lib/ramen-result";
import type { RamenTitle } from "@/client/lib/ramen-title";

describe("parseGaMeasurementId", () => {
  it("測定 ID の形をした値はそのまま返す（前後の空白は取り除く）", () => {
    expect(parseGaMeasurementId("G-ABC123XYZ")).toBe("G-ABC123XYZ");
    expect(parseGaMeasurementId("  G-ABC123XYZ  ")).toBe("G-ABC123XYZ");
  });

  it("未設定や空文字のときは null を返す", () => {
    expect(parseGaMeasurementId(undefined)).toBeNull();
    expect(parseGaMeasurementId("")).toBeNull();
    expect(parseGaMeasurementId("   ")).toBeNull();
  });

  it("測定 ID の形でない値のときは null を返す", () => {
    expect(parseGaMeasurementId("UA-12345-1")).toBeNull();
    expect(parseGaMeasurementId("G-abc');alert(1);//")).toBeNull();
  });
});

const course = COURSES[0];

const result: PlayResult = {
  ...emptyPlayStats,
  servedCount: 12,
  discardedCount: 2,
  bill: 2_400,
  correctKeyCount: 300,
  missCount: 7,
  kaedamaCount: 3,
  maxStreak: 5,
  accuracy: 300 / 307,
  keysPerSecond: 300 / 60,
};

const title: RamenTitle = { id: "regular", name: "常連さん", remark: "" };

describe("playEndParams", () => {
  it("成績を数値のまま、正確率と打鍵数は小数 1 桁にして並べる", () => {
    expect(
      playEndParams({
        course,
        toppings: ["gekikara", "ninniku"],
        result: { ...result, keysPerSecond: 4.96 },
        title,
        isPersonalBest: true,
      }),
    ).toEqual({
      course_id: "nami",
      course_name: "並",
      toppings: "gekikara,ninniku",
      bill: 2_400,
      balance: -600,
      served_count: 12,
      discarded_count: 2,
      miss_count: 7,
      accuracy: 97.7,
      keys_per_second: 5,
      max_streak: 5,
      kaedama_count: 3,
      title_id: "regular",
      is_personal_best: true,
    });
  });

  it("トッピングを選んでいなければ none にする", () => {
    expect(
      playEndParams({
        course,
        toppings: [],
        result,
        title,
        isPersonalBest: false,
      }),
    ).toMatchObject({ toppings: "none", is_personal_best: false });
  });
});

describe("GA4 へのイベントの送信", () => {
  const globalWithWindow = globalThis as { window?: Partial<Window> };

  afterEach(() => {
    delete globalWithWindow.window;
  });

  function installGtag() {
    const gtag = jest.fn();
    globalWithWindow.window = { gtag };
    return gtag;
  }

  it("プレイの開始と終了を、コースとトッピングをつけて送る", () => {
    const gtag = installGtag();

    trackPlayStart(course, ["ninniku"]);
    trackPlayEnd({
      course,
      toppings: [],
      result,
      title,
      isPersonalBest: false,
    });

    expect(gtag.mock.calls).toEqual([
      [
        "event",
        "play_start",
        { course_id: "nami", course_name: "並", toppings: "ninniku" },
      ],
      [
        "event",
        "play_end",
        playEndParams({
          course,
          toppings: [],
          result,
          title,
          isPersonalBest: false,
        }),
      ],
    ]);
  });

  it("もう一杯・共有・案内・食券の放棄・効果音の切り替えを、それぞれのパラメータで送る", () => {
    const gtag = installGtag();

    trackReplay(course);
    trackShare(course);
    trackImeNoticeShown(course);
    trackTouchNoticeShown();
    trackTicketAbandon(course);
    trackSoundToggle(false);

    expect(gtag.mock.calls).toEqual([
      ["event", "replay", { course_id: "nami" }],
      [
        "event",
        "share",
        { method: "x", content_type: "result", item_id: "nami" },
      ],
      ["event", "ime_notice_shown", { course_id: "nami" }],
      ["event", "touch_notice_shown", {}],
      [
        "event",
        "ticket_abandon",
        { course_id: "nami", transport_type: "beacon" },
      ],
      ["event", "sound_toggle", { enabled: false }],
    ]);
  });

  it("GA4 のタグが無いとき（測定 ID が未設定など）は何もしない", () => {
    globalWithWindow.window = {};
    expect(() => trackPlayStart(course, [])).not.toThrow();
    expect(() => trackTicketAbandon(course)).not.toThrow();
  });

  it("タグが例外を投げても、ゲームに例外を伝えない", () => {
    globalWithWindow.window = {
      gtag: () => {
        throw new Error("blocked");
      },
    };
    expect(() => trackSoundToggle(true)).not.toThrow();
  });

  it("サーバー側（window が無い）では何もしない", () => {
    expect(() => trackPlayStart(course, [])).not.toThrow();
  });
});
