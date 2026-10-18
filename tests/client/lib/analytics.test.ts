import {
  parseGaMeasurementId,
  trackPlayEnd,
  trackPlayStart,
} from "@/client/lib/analytics";
import { COURSES } from "@/client/lib/ramen-course";

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

describe("trackPlayStart / trackPlayEnd", () => {
  const course = COURSES[0];
  const globalWithWindow = globalThis as { window?: Partial<Window> };

  afterEach(() => {
    delete globalWithWindow.window;
  });

  it("GA4 のタグがあるとき、コース名をつけてプレイの開始と終了を送る", () => {
    const gtag = jest.fn();
    globalWithWindow.window = { gtag };

    trackPlayStart(course);
    trackPlayEnd(course);

    expect(gtag.mock.calls).toEqual([
      ["event", "play_start", { course_id: "nami", course_name: "並" }],
      ["event", "play_end", { course_id: "nami", course_name: "並" }],
    ]);
  });

  it("GA4 のタグが無いとき（測定 ID が未設定など）は何もしない", () => {
    globalWithWindow.window = {};
    expect(() => trackPlayStart(course)).not.toThrow();
    expect(() => trackPlayEnd(course)).not.toThrow();
  });

  it("サーバー側（window が無い）では何もしない", () => {
    expect(() => trackPlayStart(course)).not.toThrow();
  });
});
