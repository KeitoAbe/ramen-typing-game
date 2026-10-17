---
allowed-tools: Bash(git:*), Bash(gh:*), Bash(pnpm:*)
argument-hint: <PR番号>
description: loop PR の必須チェックの失敗、または main とのコンフリクトを直して push する（結果は待たない）
---

# ループ: PR の CI を直す

あなたはループの修理セッションです。loop PR **#$ARGUMENTS** の必須チェック `ci-complete` の失敗、
または main とのコンフリクトを直して push し、終了します。
最初に [docs/loop-session-rules.md](../../docs/loop-session-rules.md) を読んでください。

## 現在の状況

- ブランチ: !`git branch --show-current`
- PR: !`gh pr view $ARGUMENTS --json number,title,headRefName,mergeStateStatus,headRefOid --jq '"#\(.number) \(.title) [\(.headRefName)] merge=\(.mergeStateStatus) head=\(.headRefOid[0:8])"'`
- チェック: !`gh pr checks $ARGUMENTS 2>&1 || true`
- 紐づく Issue: !`gh pr view $ARGUMENTS --json body --jq '[.body | scan("[Cc]loses #([0-9]+)")[]] | join(",")'`

## 手順

1. `gh pr checkout $ARGUMENTS` でブランチに乗る。
2. **直す対象を見極める。** 対象は `ci-complete` の失敗と、コンフリクト（mergeStateStatus が DIRTY）だけ。
   必須でないチェックの失敗は直さない。
3. **直す。**
   - コンフリクトなら、`git fetch origin main` のあと `git merge origin/main` で解消する。
   - チェックの失敗なら、`gh run view <run id> --log-failed` で失敗したジョブのログを読み、原因を直す。
   - 直す範囲は、PR の元の Issue のスコープ内に留める。新しい機能が要るなら Issue に切り出す。
   - `pnpm verify` を通す。修正の試行は 3 回まで。
4. **push して記録する。**
   - `fix: <何を直したか>` でコミットして push する。
   - `gh pr view $ARGUMENTS --json autoMergeRequest --jq '.autoMergeRequest != null'` が false なら、
     `gh pr merge $ARGUMENTS --auto --squash` で予約し直す。
   - PR にコメントする: `🤖 CI を直しました: <何が落ちていて、何を直したか>（<commit>）`
5. **終了する。** CI の再実行結果は待たない。まだ落ちていれば、次の tick でこのコマンドがまた呼ばれる。
   - 直して push できた: `LOOP_RESULT: SUCCESS issue=#<紐づく Issue> pr=<PR の URL>`
   - 3 回試しても通らない、またはループでは直せない（外部サービスの障害など）: 紐づく Issue を `loop:blocked` か `loop:human` にし、
     Issue と PR に状況をコメントして、PR は open のまま `LOOP_RESULT: BLOCKED issue=#<N> reason=<短い理由>`
