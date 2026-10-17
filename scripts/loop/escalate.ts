// decide() が列挙した、セッションを起動せずにランナー自身が行う GitHub への書き込みを反映する。
// ラベルの付け替え・コメント・再レビュー依頼・Request changes の取り下げだけを行い、コードには触れない。

import { gh } from "./gh";
import type { Decision, EscalationReason, FlagReason } from "./types";

const ESCALATION_MESSAGES: Record<EscalationReason, string> = {
  "human-review":
    "🤖 人間のレビューコメントが未解決なので、この PR はループの対象から外して人間に引き継ぎます。ループが自動で扱うのは coderabbitai のスレッドだけです。対応が終わったら Issue を `loop:ready` に戻してください。",
  "budget-exceeded":
    "🤖 CodeRabbit 対応の修正回数が上限に達しても未解決の指摘が残っているので、人間に引き継ぎます。PR と auto-merge の予約はそのまま残しています。残りの指摘を判断してください。",
};

const FLAG_MESSAGES: Record<FlagReason, string> = {
  "untrusted-author":
    "🤖 起票者がリポジトリのメンバーではないので `loop:ready` を外しました。ループはメンバーが起票した Issue だけを指示として扱います。採用する場合は、メンバーが内容を確認して書き直した Issue を新しく起票してください。",
  "dead-dependency":
    "🤖 「#X のマージ後に着手」で指定された依存先が、main にマージされないまま閉じられています。待っても前提がそろわないので `loop:human` に切り替えました。依存の記述を直してから `loop:ready` に戻してください。",
};

export interface EscalationSummary {
  escalated: number;
  flagged: number;
  nudged: number;
  dismissed: number;
}

export function applyRunnerActions(
  decision: Decision,
  repo: string,
): EscalationSummary {
  const summary: EscalationSummary = {
    escalated: 0,
    flagged: 0,
    nudged: 0,
    dismissed: 0,
  };

  for (const e of decision.escalations) {
    gh([
      "pr",
      "comment",
      String(e.pr),
      "--body",
      ESCALATION_MESSAGES[e.reason],
    ]);
    if (e.issue !== null) {
      gh([
        "issue",
        "edit",
        String(e.issue),
        "--remove-label",
        "loop:wip",
        "--add-label",
        "loop:human",
      ]);
      gh([
        "issue",
        "comment",
        String(e.issue),
        "--body",
        `🤖 PR #${e.pr} を人間に引き継ぎました（${e.reason}）。理由は PR のコメントを見てください。`,
      ]);
    }
    log(`PR #${e.pr} → loop:human (${e.reason})`);
    summary.escalated++;
  }

  for (const f of decision.flags) {
    gh([
      "issue",
      "edit",
      String(f.issue),
      "--remove-label",
      "loop:ready",
      "--add-label",
      "loop:human",
    ]);
    gh([
      "issue",
      "comment",
      String(f.issue),
      "--body",
      FLAG_MESSAGES[f.reason],
    ]);
    log(`Issue #${f.issue} → loop:human (${f.reason})`);
    summary.flagged++;
  }

  for (const pr of decision.nudges) {
    gh(["pr", "comment", String(pr), "--body", "@coderabbitai review"]);
    log(
      `PR #${pr} → CodeRabbit に再レビューを依頼（レート制限で未レビューのため）`,
    );
    summary.nudged++;
  }

  // セッションにはレビューの取り下げを禁じている（退けた根拠が残らなくなるため）。
  // ここで取り下げるのは、全スレッドに返信・resolve 済みで、head のレビューも終わっているものだけ。
  for (const d of decision.dismissals) {
    const message = `🤖 ループが取り下げました: 指摘スレッドはすべて返信・resolve 済みで、head ${d.head.slice(0, 8)} の CodeRabbit レビューも完了しています（レビュー時点の commit: ${d.reviewCommit.slice(0, 8)}）。`;
    try {
      gh([
        "api",
        "-X",
        "PUT",
        `repos/${repo}/pulls/${d.pr}/reviews/${d.reviewId}/dismissals`,
        "-f",
        `message=${message}`,
      ]);
    } catch {
      log(
        `PR #${d.pr} の Request changes を取り下げられませんでした（review ${d.reviewId}）`,
      );
      continue;
    }
    gh([
      "pr",
      "comment",
      String(d.pr),
      "--body",
      `${message} APPROVED に切り替わらず auto-merge が止まっていたためです。退けた指摘の理由は各スレッドの 🤖 返信を見てください。`,
    ]);
    log(`PR #${d.pr} の Request changes を取り下げ`);
    summary.dismissed++;
  }

  return summary;
}

function log(message: string): void {
  console.error(`[escalate] ${message}`);
}
