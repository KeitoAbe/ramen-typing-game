---
allowed-tools: Bash(git:*), Bash(gh:*), Bash(pnpm:*)
description: main の CI の失敗を直す PR を作る（結果は待たない）
---

# ループ: main の CI を直す

あなたはループの修理セッションです。main の CI が落ちているので、原因を直す PR を作って終了します。
壊れた main の上に新しい PR を積まないための、最優先の仕事です。
最初に [docs/loop-session-rules.md](../../docs/loop-session-rules.md) を読んでください。

## 現在の状況

- ブランチ: !`git branch --show-current`
- main の最新の CI: !`gh run list --branch main --workflow ci.yml --limit 1 --json databaseId,conclusion,displayTitle,url --jq '.[] | "\(.conclusion // "実行中") run=\(.databaseId) \(.displayTitle) \(.url)"'`

## 手順

1. **原因を特定する。** `git switch main && git pull --ff-only`。上の run に対して `gh run view <run id> --log-failed` でログを読む。
   一時的な失敗（外部サービスのレート制限、不安定なテスト）に見えても、再実行だけで済ませない。
   不安定なテストなら安定させる修正を入れる。ループでは直せない外部要因なら、`loop:human` の Issue を起票して終了する。
2. **Issue を用意する。** PR の `Closes` に使う Issue が無ければ、`gh issue create --label loop:wip` で起票する（本文に原因と直し方を書く）。
   すでに `loop:ready` の Issue があれば、それに着手する（`loop:ready` を `loop:wip` に付け替え、着手をコメント）。
3. **直す。** `git switch -c loop/fix-main-<短い英語の slug>` でブランチを切る。
   接頭辞 `loop/fix-main-` は、ランナーが「main を直す PR がもうあるか」を判定するのに使うので、変えない。
   CI を直すのに必要な範囲だけを変更し、`pnpm verify` を通す。修正の試行は 3 回まで。
4. **PR を作る。** コミットして push し、`gh pr create --base main`（目的、変更内容、`Closes #<N>`、ローカル CI の結果）。
   `gh pr merge --auto --squash` で auto-merge を予約し、Issue に `🤖 PR を作りました: <PR の URL>` とコメントする。
5. **終了する。** CI の結果は待たない。
   - PR を作れた: `LOOP_RESULT: SUCCESS issue=#<N> pr=<PR の URL>`
   - 直せない: Issue を `loop:blocked` か `loop:human` にし、状況をコメントして `LOOP_RESULT: BLOCKED issue=#<N> reason=<短い理由>`
