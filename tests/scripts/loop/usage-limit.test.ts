import { detectUsageLimit } from "@scripts/loop/usage-limit";

describe("detectUsageLimit", () => {
  // 2026-10-18 11:00 JST
  const now = new Date("2026-10-18T02:00:00Z");

  it("解除時刻の時・分と午前・午後を、タイムゾーンに合わせて読む", () => {
    expect(
      detectUsageLimit(
        "You've hit your session limit · resets 12:20pm (Asia/Tokyo)",
        now,
      ),
    ).toEqual({ resetAt: new Date("2026-10-18T03:20:00Z") });
  });

  it("分が無い形も読む", () => {
    expect(
      detectUsageLimit("You've hit your limit · resets 7am (Asia/Tokyo)", now)
        ?.resetAt,
    ).toEqual(new Date("2026-10-18T22:00:00Z"));
  });

  it("その時刻を今日すでに過ぎていれば、翌日の時刻にする", () => {
    expect(
      detectUsageLimit(
        "You've hit your session limit · resets 7:20am (Asia/Tokyo)",
        now,
      )?.resetAt,
    ).toEqual(new Date("2026-10-18T22:20:00Z"));
  });

  it("午前 12 時は 0 時として読む", () => {
    expect(
      detectUsageLimit(
        "You've hit your session limit · resets 12am (Asia/Tokyo)",
        now,
      )?.resetAt,
    ).toEqual(new Date("2026-10-18T15:00:00Z"));
  });

  it("日付の付いた形も読む", () => {
    expect(
      detectUsageLimit(
        "You've hit your weekly limit · resets Oct 20, 3pm (Asia/Tokyo)",
        now,
      )?.resetAt,
    ).toEqual(new Date("2026-10-20T06:00:00Z"));
  });

  it("年末に翌年 1 月の日付が出たら、翌年として読む", () => {
    expect(
      detectUsageLimit(
        "You've hit your weekly limit · resets Jan 2, 9am (Asia/Tokyo)",
        new Date("2026-12-30T00:00:00Z"),
      )?.resetAt,
    ).toEqual(new Date("2027-01-02T00:00:00Z"));
  });

  it("夏時間のあるタイムゾーンでも、その日のずれで読む", () => {
    // 2026-10-18 は米国の夏時間（UTC-4）
    expect(
      detectUsageLimit(
        "You've hit your session limit · resets 3pm (America/New_York)",
        now,
      )?.resetAt,
    ).toEqual(new Date("2026-10-18T19:00:00Z"));
  });

  it("上限に当たっているが解除時刻が読めなければ、resetAt は null", () => {
    expect(detectUsageLimit("You've hit your usage limit.", now)).toEqual({
      resetAt: null,
    });
    expect(
      detectUsageLimit(
        "You've hit your session limit · resets 12:20pm (Not/AZone)",
        now,
      ),
    ).toEqual({ resetAt: null });
  });

  it("利用上限の文言が無ければ null", () => {
    expect(detectUsageLimit("途中で終わった", now)).toBeNull();
    expect(
      detectUsageLimit("LOOP_RESULT: FAILED kind=transient reason=x", now),
    ).toBeNull();
  });
});
