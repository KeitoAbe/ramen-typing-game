import type { PlayResult } from "@/client/lib/ramen-result";

type Props = {
  result: PlayResult;
  onReplay: () => void;
};

export function RamenResult({ result, onReplay }: Props) {
  const rows = [
    { label: "平らげた杯数", value: `${result.servedCount} 杯` },
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
        <p className="text-zinc-600 dark:text-zinc-400">お会計</p>
        <p className="text-4xl font-semibold">
          {result.bill.toLocaleString("ja-JP")} 円
        </p>
      </div>
      <dl className="grid w-full max-w-sm grid-cols-2 gap-x-6 gap-y-2 text-lg">
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <dt className="text-zinc-600 dark:text-zinc-400">{row.label}</dt>
            <dd className="text-right font-semibold">{row.value}</dd>
          </div>
        ))}
      </dl>
      <button
        type="button"
        onClick={onReplay}
        className="rounded-md bg-red-700 px-6 py-3 font-semibold text-white hover:bg-red-800"
      >
        もう一杯
      </button>
    </section>
  );
}
