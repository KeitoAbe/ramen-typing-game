// LLM セッション（Claude Code）を 1 つ起動し、ループコマンドを 1 回だけ実行させる。
// セッションは毎回新規に起動して使い捨てにする（コンテキストが膨らむと品質が落ちるため）。
//
// 無人実行だが、権限確認を丸ごと省略するのではなく、使ってよいツールを許可リストで限定する。
// 許可リストに無い操作は、確認を求めずに拒否される（-p モードの挙動）。

import { spawn } from "node:child_process";
import { appendFileSync } from "node:fs";
import type { SessionCommand } from "./types";

/** セッションに許可するツール。ループの仕事（実装・テスト・PR 操作）に必要な最小限 */
const ALLOWED_TOOLS = [
  "Read",
  "Edit",
  "Write",
  "Glob",
  "Grep",
  "Skill",
  "Bash(git:*)",
  "Bash(gh:*)",
  "Bash(pnpm:*)",
  "Bash(ls:*)",
];

/** 許可リストの範囲内でも禁止する、取り返しのつかない操作 */
const DISALLOWED_TOOLS = [
  "Bash(git push --force:*)",
  "Bash(git push -f:*)",
  "Bash(git push --force-with-lease:*)",
  "Bash(git reset --hard:*)",
  "Bash(git clean -fdx:*)",
  "Bash(gh repo delete:*)",
  "Bash(gh repo edit:*)",
  "Bash(gh secret:*)",
  "Bash(gh auth:*)",
  "Bash(gh release:*)",
  "Bash(gh workflow run:*)",
  "Bash(gh pr merge --admin:*)",
  // 本番は production ブランチから配信する。昇格は人間だけが行う（docs/loop-engineering.md）
  "Bash(git push origin production:*)",
  "Bash(git push origin main:production:*)",
  "Bash(git push origin HEAD:production:*)",
  "Bash(git push origin origin/main:production:*)",
];

export interface SessionOutcome {
  /** セッションの出力（LOOP_RESULT 行を含む） */
  text: string;
  /** モデルが応答したターン数。0 ならスラッシュコマンドの展開に失敗している */
  turns: number | null;
}

export type LoopResult =
  | { kind: "SUCCESS"; line: string }
  | { kind: "BLOCKED"; line: string }
  | { kind: "FAILED"; deterministic: boolean; line: string };

/** セッション出力の最後の LOOP_RESULT 行を読む。見つからなければ null */
export function parseLoopResult(text: string): LoopResult | null {
  const last = [...text.matchAll(/LOOP_RESULT: ([A-Z_]+)[^\r\n]*/g)].at(-1);
  if (!last) return null;
  const line = last[0];
  switch (last[1]) {
    case "SUCCESS":
      return { kind: "SUCCESS", line };
    case "BLOCKED":
      return { kind: "BLOCKED", line };
    default:
      return {
        kind: "FAILED",
        deterministic: line.includes("kind=deterministic"),
        line,
      };
  }
}

interface StreamEvent {
  type?: string;
  subtype?: string;
  model?: string;
  num_turns?: number;
  total_cost_usd?: number;
  result?: string;
  message?: {
    content?: { type: string; text?: string; name?: string; input?: unknown }[];
  };
}

/** stream-json の 1 イベントを、人間が追える進捗行にする */
function describe(event: StreamEvent): string | null {
  const time = new Date().toLocaleTimeString("ja-JP", { hour12: false });
  if (event.type === "system" && event.subtype === "init") {
    return `[${time}] セッション開始 (model: ${event.model ?? "?"})`;
  }
  if (event.type === "assistant") {
    const parts = (event.message?.content ?? []).flatMap((c) => {
      if (c.type === "text" && c.text) return [c.text];
      if (c.type === "tool_use") {
        const input = JSON.stringify(c.input ?? {}).slice(0, 150);
        return [`[${time}] → ${c.name}: ${input}`];
      }
      return [];
    });
    return parts.length > 0 ? parts.join("\n") : null;
  }
  if (event.type === "result") {
    return `[${time}] セッション終了 (turns: ${event.num_turns ?? "?"}, cost: $${event.total_cost_usd ?? 0})\n${event.result ?? ""}`;
  }
  return null;
}

export function runSession(
  command: SessionCommand,
  argument: string,
  model: string,
  logFile: string,
): Promise<SessionOutcome> {
  const write = (line: string) => {
    console.log(line);
    appendFileSync(logFile, `${line}\n`);
  };

  return new Promise((resolve) => {
    const child = spawn(
      "claude",
      [
        "-p",
        `/${command} ${argument}`.trim(),
        "--model",
        model,
        "--allowedTools",
        ALLOWED_TOOLS.join(","),
        "--disallowedTools",
        DISALLOWED_TOOLS.join(","),
        // ユーザー設定（~/.claude/settings.json）は読まない。そこにある ask は -p では拒否になり、
        // ランナーの許可リストと関係なくセッションの操作を止めてしまうため（gh pr create で実際に止まった）
        "--setting-sources",
        "project,local",
        "--verbose",
        "--output-format",
        "stream-json",
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );

    const transcript: string[] = [];
    let buffer = "";
    let turns: number | null = null;

    const handleLine = (line: string) => {
      if (line.trim() === "") return;
      let event: StreamEvent;
      try {
        event = JSON.parse(line) as StreamEvent;
      } catch {
        write(line);
        transcript.push(line);
        return;
      }
      if (event.type === "result") turns = event.num_turns ?? null;
      const description = describe(event);
      if (description) {
        write(description);
        transcript.push(description);
      }
    };

    child.stdout.on("data", (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      lines.forEach(handleLine);
    });
    child.stderr.on("data", (chunk: Buffer) =>
      write(chunk.toString().trimEnd()),
    );
    child.on("error", (error) => {
      write(`[session] claude を起動できませんでした: ${error.message}`);
      resolve({
        text: "LOOP_RESULT: FAILED kind=deterministic reason=claude-not-found",
        turns,
      });
    });
    child.on("close", () => {
      handleLine(buffer);
      resolve({ text: transcript.join("\n"), turns });
    });
  });
}
