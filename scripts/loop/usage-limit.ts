// セッションが Claude の利用上限で打ち切られたかを、出力の文言から見分ける。
// 上限に当たったセッションは仕事をしていないので、失敗として数えずに解除を待つ（runner.ts）。

/** 利用上限に当たったときの出力。例: "You've hit your session limit · resets 12:20pm (Asia/Tokyo)" */
const LIMIT_PATTERN = /hit your (?:[a-z]+ )?limit|usage limit reached/gi;

/** 解除時刻の部分。日付が付く形（"resets Oct 20, 3pm (Asia/Tokyo)"）も読む */
const RESET_PATTERN =
  /resets\s+(?:([A-Z][a-z]{2})\s+(\d{1,2}),?\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*\(([^)]+)\)/i;

const MONTHS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

export interface UsageLimit {
  /** 解除される時刻。文言から読み取れなければ null */
  resetAt: Date | null;
}

/** その時刻における、タイムゾーンの UTC からのずれ（ミリ秒） */
function offsetMs(instant: number, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    })
      .formatToParts(new Date(instant))
      .map((p) => [p.type, Number(p.value)]),
  );
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return asUtc - Math.floor(instant / 1000) * 1000;
}

/** タイムゾーンでの日付と時刻を、実際の時刻にする */
function zonedTime(
  year: number,
  monthIndex: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): number {
  const guess = Date.UTC(year, monthIndex, day, hour, minute);
  const first = guess - offsetMs(guess, timeZone);
  // 夏時間の切り替わりをまたぐと 1 回目のずれが合わないので、求めた時刻のずれで取り直す
  return guess - offsetMs(first, timeZone);
}

/** タイムゾーンでの「今日」の年・月・日 */
function zonedDate(now: Date, timeZone: string) {
  const local = new Date(now.getTime() + offsetMs(now.getTime(), timeZone));
  return {
    year: local.getUTCFullYear(),
    monthIndex: local.getUTCMonth(),
    day: local.getUTCDate(),
  };
}

function parseResetAt(text: string, now: Date): Date | null {
  const match = text.match(RESET_PATTERN);
  if (!match) return null;
  const [, monthName, dayText, hourText, minuteText, meridiem, timeZone] =
    match;
  const hour =
    (Number(hourText) % 12) + (meridiem.toLowerCase() === "pm" ? 12 : 0);
  const minute = Number(minuteText ?? 0);
  try {
    const today = zonedDate(now, timeZone);
    if (monthName) {
      const monthIndex = MONTHS.indexOf(monthName.toLowerCase());
      if (monthIndex < 0) return null;
      let resetAt = zonedTime(
        today.year,
        monthIndex,
        Number(dayText),
        hour,
        minute,
        timeZone,
      );
      // 年末に翌年 1 月の日付が出たときは、翌年として読む
      if (resetAt < now.getTime() - 24 * 60 * 60 * 1000) {
        resetAt = zonedTime(
          today.year + 1,
          monthIndex,
          Number(dayText),
          hour,
          minute,
          timeZone,
        );
      }
      return new Date(resetAt);
    }
    // 時刻だけのときは、その時刻が次に来る時点。今日のその時刻を過ぎていれば翌日
    const resetAt = zonedTime(
      today.year,
      today.monthIndex,
      today.day,
      hour,
      minute,
      timeZone,
    );
    if (resetAt > now.getTime()) return new Date(resetAt);
    return new Date(
      zonedTime(
        today.year,
        today.monthIndex,
        today.day + 1,
        hour,
        minute,
        timeZone,
      ),
    );
  } catch {
    // 知らないタイムゾーン名（Intl が RangeError を投げる）
    return null;
  }
}

/**
 * セッションの出力が利用上限によるものなら、解除時刻を返す。そうでなければ null。
 * 出力にはセッションの途中のログも含まれるので、最後の上限の通知より後ろだけから解除時刻を読む
 */
export function detectUsageLimit(text: string, now: Date): UsageLimit | null {
  const limit = [...text.matchAll(LIMIT_PATTERN)].at(-1);
  if (!limit) return null;
  const notice = text.slice(limit.index + limit[0].length);
  return { resetAt: parseResetAt(notice, now) };
}
