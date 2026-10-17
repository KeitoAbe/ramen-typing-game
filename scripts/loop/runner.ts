// tick を繰り返し、停止条件を管理する。
// 「いつ止めるか」は nextRunnerState() に純粋関数として切り出し、テストで固定している。

import { git } from "./gh";
import { collectState, fingerprint } from "./state";
import { runTick, type TickResult } from "./tick";

const MAX_CONSECUTIVE_FAILURES = 2;
const MAX_CONSECUTIVE_ESCALATIONS = 3;

type StopReason =
  | "COMPLETED"
  | "NO_TASK"
  | "ESCALATED_LIMIT"
  | "FAILED_LIMIT"
  | "FAILED_DETERMINISTIC"
  | "WAIT_TIMEOUT"
  | "ATTEMPT_LIMIT";

export interface RunnerState {
  completed: number;
  attempts: number;
  consecutiveFailures: number;
  consecutiveEscalations: number;
  stop: StopReason | null;
}

export const initialRunnerState = (): RunnerState => ({
  completed: 0,
  attempts: 0,
  consecutiveFailures: 0,
  consecutiveEscalations: 0,
  stop: null,
});

/**
 * 1 tick の結果から次の状態を決める。「連続」は文字どおりで、別の結果が出たらカウンタは 0 に戻る。
 * waiting はここでは止めない（待機の打ち切りは呼び出し側が時間で判定する）。
 */
export function nextRunnerState(
  prev: RunnerState,
  result: TickResult,
  target: number,
): RunnerState {
  const s: RunnerState = { ...prev, attempts: prev.attempts + 1 };
  switch (result.kind) {
    case "success":
      s.completed++;
      s.consecutiveFailures = 0;
      s.consecutiveEscalations = 0;
      if (s.completed >= target) s.stop = "COMPLETED";
      break;
    case "no-task":
      s.stop = "NO_TASK";
      break;
    case "escalated":
      s.consecutiveFailures = 0;
      s.consecutiveEscalations++;
      if (s.consecutiveEscalations >= MAX_CONSECUTIVE_ESCALATIONS)
        s.stop = "ESCALATED_LIMIT";
      break;
    case "waiting":
      s.consecutiveFailures = 0;
      s.consecutiveEscalations = 0;
      break;
    case "failed":
      if (result.deterministic) {
        s.stop = "FAILED_DETERMINISTIC";
        break;
      }
      s.consecutiveEscalations = 0;
      s.consecutiveFailures++;
      if (s.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES)
        s.stop = "FAILED_LIMIT";
      break;
  }
  // 安全弁: 失敗と成功を交互に繰り返すような状況でも、試行回数で打ち切る
  if (s.stop === null && s.attempts >= target * 4) s.stop = "ATTEMPT_LIMIT";
  return s;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 状態が変わるまで待つ。変わったら true、上限時間を超えたら false */
async function waitForChange(
  intervalSeconds: number,
  remainingSeconds: number,
) {
  const before = safeFingerprint();
  let waited = 0;
  while (waited < remainingSeconds) {
    await sleep(intervalSeconds * 1000);
    waited += intervalSeconds;
    const after = safeFingerprint();
    if (after !== null && after !== before) return { changed: true, waited };
  }
  return { changed: false, waited };
}

function safeFingerprint(): string | null {
  try {
    return fingerprint(collectState());
  } catch {
    return null;
  }
}

export async function runLoop(
  target: number,
  model: string,
): Promise<RunnerState> {
  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const logDir = `.loop/logs/${runId}`;
  const waitInterval = Number(process.env.LOOP_WAIT_SECONDS ?? 60);
  const maxWait = Number(process.env.LOOP_MAX_WAIT_SECONDS ?? 7200);
  const history: string[] = [];
  let state = initialRunnerState();
  let waitedSeconds = 0;

  console.log(
    `== loop run ${runId}: SUCCESS ${target} 回まで, model: ${model} (ログ: ${logDir}) ==`,
  );

  while (state.stop === null) {
    const tickNo = state.attempts + 1;
    console.log(
      `\n[loop] tick ${tickNo} (SUCCESS ${state.completed}/${target})`,
    );
    const result = await runTick(model, `${logDir}/tick-${tickNo}.log`);
    history.push(`[tick ${tickNo}] ${JSON.stringify(result)}`);
    state = nextRunnerState(state, result, target);

    if (result.kind !== "waiting") {
      waitedSeconds = 0;
      continue;
    }
    if (state.stop !== null) break;
    console.log(
      `[loop] 待機: ${waitInterval} 秒ごとに状態を取り直します（累計 ${Math.floor(waitedSeconds / 60)} 分）`,
    );
    const { changed, waited } = await waitForChange(
      waitInterval,
      maxWait - waitedSeconds,
    );
    waitedSeconds += waited;
    if (!changed) state = { ...state, stop: "WAIT_TIMEOUT" };
  }

  returnToMain();
  console.log(`\n== loop run ${runId} サマリ ==\n${history.join("\n")}\n`);
  console.log(
    `LOOP_RUN_RESULT: ${state.stop} completed=${state.completed}/${target} attempts=${state.attempts}`,
  );
  return state;
}

/** 次に人間が作業しやすいよう main に戻す（汚れていれば退避してから） */
function returnToMain(): void {
  try {
    const branch = git(["branch", "--show-current"]).trim();
    if (branch === "main") return;
    if (git(["status", "--porcelain"]).trim() !== "") {
      git([
        "stash",
        "push",
        "-u",
        "-m",
        `loop-abandoned:${branch}:${Date.now()}`,
      ]);
    }
    git(["checkout", "-q", "main"]);
  } catch (error) {
    console.error(
      `[loop] main に戻れませんでした: ${(error as Error).message}`,
    );
  }
}
