// ループランナーの入口。package.json の scripts から呼ぶ。
//
//   pnpm loop 10 [--model opus]   SUCCESS が 10 回になるまで回す（夜間バッチ向け）
//   pnpm loop:once [--model opus] 1 tick だけ実行する
//   pnpm loop:state               いまの状態を表示する（読み取り専用）
//   pnpm loop:decide              次の tick が何をするかを表示する（読み取り専用）
//   pnpm loop:apply               判定し、ランナー側の書き込み（ラベル付け替えなど）だけを反映する。
//                                 対話セッションの /loop-once が使う

import { decide } from "./decide";
import { applyRunnerActions } from "./escalate";
import { runLoop } from "./runner";
import { collectState } from "./state";
import { loadConfig, runTick, type TickResult } from "./tick";

// loop:once の終了コード。シェルから結果を判別できるようにする
const EXIT_CODES: Record<TickResult["kind"], number> = {
  success: 0,
  "no-task": 2,
  escalated: 3,
  waiting: 4,
  failed: 1,
};

function parseModel(args: string[]): string {
  const index = args.indexOf("--model");
  return index >= 0 && args[index + 1]
    ? args[index + 1]
    : (process.env.LOOP_MODEL ?? "opus");
}

async function main(): Promise<number> {
  const [command, ...args] = process.argv.slice(2);
  switch (command) {
    case "state":
      console.log(JSON.stringify(collectState(), null, 2));
      return 0;
    case "decide":
      console.log(
        JSON.stringify(
          decide(collectState(), loadConfig(), new Date()),
          null,
          2,
        ),
      );
      return 0;
    case "apply": {
      const state = collectState();
      const decision = decide(state, loadConfig(), new Date());
      applyRunnerActions(decision, state.repo);
      console.log(JSON.stringify(decision, null, 2));
      return 0;
    }
    case "once": {
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const result = await runTick(
        parseModel(args),
        `.loop/logs/single-${stamp}.log`,
      );
      console.log(`LOOP_TICK_RESULT: ${JSON.stringify(result)}`);
      if (result.kind === "failed" && result.deterministic) return 5;
      return EXIT_CODES[result.kind];
    }
    case "run": {
      const target = Number(args.find((a) => /^\d+$/.test(a)) ?? 1);
      const state = await runLoop(target, parseModel(args));
      return state.stop === "COMPLETED" || state.stop === "NO_TASK" ? 0 : 1;
    }
    default:
      console.error(
        "usage: cli.ts <run [回数] | once | state | decide | apply> [--model <model>]",
      );
      return 1;
  }
}

main().then(
  (code) => process.exit(code),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
