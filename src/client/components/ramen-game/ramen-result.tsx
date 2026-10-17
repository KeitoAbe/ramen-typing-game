import {
  type Course,
  courseBalance,
  formatBalance,
} from "@/client/lib/ramen-course";
import type { PersonalBestRecord } from "@/client/lib/ramen-personal-best";
import type { PlayResult } from "@/client/lib/ramen-result";
import { decideTitle } from "@/client/lib/ramen-title";

type Props = {
  course: Course;
  result: PlayResult;
  /** 自己ベストとの比較。記録が済むまでは null */
  personalBest: PersonalBestRecord | null;
  onReplay: () => void;
};

export function RamenResult({ course, result, personalBest, onReplay }: Props) {
  const balance = courseBalance(result.bill, course);
  const title = decideTitle(result, course);
  const rows = [
    { label: "平らげた杯数", value: `${result.servedCount} 杯` },
    { label: "のびて下げられた丼", value: `${result.discardedCount} 杯` },
    { label: "替え玉", value: `${result.kaedamaCount} 回` },
    { label: "正しく打ったキー数", value: `${result.correctKeyCount} 回` },
    { label: "ミスタイプ数", value: `${result.missCount} 回` },
    { label: "正確率", value: `${(result.accuracy * 100).toFixed(1)} %` },
    {
      label: "平均打鍵数",
      value: `${result.keysPerSecond.toFixed(1)} 回/秒`,
    },
  ];

  return (
    <section className="flex flex-col items-center gap-6">
      <p className="text-4xl font-bold">閉店</p>
      <div className="flex flex-col items-center gap-1">
        <p className="text-yatai-kinari/75">お会計</p>
        <p className="text-4xl font-semibold">
          {result.bill.toLocaleString("ja-JP")} 円
        </p>
        <p className="text-yatai-kinari/75">
          食券: {course.name}（{course.price.toLocaleString("ja-JP")} 円）
        </p>
        <p
          className={`text-2xl font-bold ${balance >= 0 ? "text-yatai-amber" : "text-sky-300"}`}
        >
          {formatBalance(balance)}
        </p>
        {/* 記録は表示のあとに済むので、出たときに読み上げる */}
        <div aria-live="polite" className="flex flex-col items-center gap-1">
          {personalBest?.isUpdated && (
            <p className="rounded-full bg-yatai-amber px-3 py-1 text-sm font-bold text-yatai-sumi">
              自己ベスト更新！
            </p>
          )}
          {personalBest && (
            <p className="text-yatai-kinari/75">
              {course.name}の自己ベスト: {formatBalance(personalBest.best)}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-col items-center gap-1">
        <p className="text-yatai-kinari/75">称号</p>
        <p className="text-3xl font-bold">{title.name}</p>
        <p className="text-yatai-kinari/75">「{title.remark}」</p>
      </div>
      <dl className="grid w-full max-w-sm grid-cols-2 gap-x-6 gap-y-2 text-lg">
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <dt className="text-yatai-kinari/75">{row.label}</dt>
            <dd className="text-right font-semibold">{row.value}</dd>
          </div>
        ))}
      </dl>
      <button
        type="button"
        onClick={onReplay}
        className="rounded-md bg-yatai-lantern px-6 py-3 font-semibold text-yatai-kinari hover:bg-yatai-lantern-dark"
      >
        もう一杯
      </button>
    </section>
  );
}
