---
allowed-tools: Bash(git:*), Bash(gh:*), Bash(pnpm:*)
argument-hint: <やりたいことの概要>
description: ループが無人で 1 PR に実装できる粒度の loop:ready Issue を起票する
---

# ループ向けの Issue を起票する

あなたはループに**タスクを供給する**役です。ユーザーの要望を、`/loop-implement` が無人で 1 つの PR に実装できる Issue にして起票します。
このコマンドは対話で使う前提です。曖昧な点はユーザーに確認してください。

## 依頼

$ARGUMENTS

## 現在の状況

- open な loop:ready の Issue: !`gh issue list --label loop:ready --state open --limit 200 --json number,title --jq 'sort_by(.number)[] | "#\(.number) \(.title)"'`
- 人間の対応待ちの Issue: !`gh issue list --state open --limit 200 --json number,title,labels --jq '.[] | select(any(.labels[].name; . == "loop:human" or . == "loop:blocked")) | "#\(.number) \(.title)"'`
- open な loop PR: !`gh pr list --state open --limit 200 --json number,title,headRefName --jq '.[] | select(.headRefName | startswith("loop/")) | "#\(.number) \(.title)"'`

## Issue を書くときの原則

1. **How（実装手順・ファイル名・関数名）は書かない。** ループは実際のコードを読んで判断する。起票時の推測で書いた How は、かえって邪魔になる。
2. **完了条件は、外から確かめられる振る舞いで書く。**（「〜の画面に〜が表示される」「〜のテストが通る」）
3. **1 Issue = 1 PR = ユーザーに価値が届く縦切り。** server と client のような層では分けない。
   中途半端な状態（API だけ、UI だけ）の Issue は、それ単体で確かめられないため。
   分けるのは、順序に実際の理由（別機能への依存、同じファイルの衝突）があるときだけにする。
   その場合は、後の Issue の本文に `#X のマージ後に着手` と書く。ランナーはこの文言をそのまま読むので、表記を変えない。
4. **やらないこと（Out of scope）を必ず書く。** ループが範囲外に広がるのを防ぐ、いちばん大事な歯止め。
5. **`loop:human` は、人間の作業や判断が本当に必要なものだけ**（外部サービスのアカウント作成、方針の決定など）。
6. **起票前にコードを読んで、前提を確かめる。** 依頼の前提が現状と違っていれば、起票せずにユーザーに伝える。

## 手順

1. 依頼を理解し、関係するコードと docs を読む。すでに実装されていないか、既存の Issue と重複していないかを確かめる。
   重複していれば起票せず、既存の Issue 番号を伝える。
2. 粒度を決める。何をどう分けるか自体に調査が要る規模なら、「〜を分解して loop:ready の Issue を起票する」という Issue を 1 つ起票する。
3. [.github/ISSUE_TEMPLATE/loop-task.md](../../.github/ISSUE_TEMPLATE/loop-task.md) の構成で本文を書く。完了条件には、常に `pnpm verify` が通ることを含める。
4. ラベルを決める: 原則 `loop:ready`。ループ全体を止めている問題なら `loop:unblock` も付ける（乱発しない）。人間の対応が要るなら `loop:human`。
5. `gh issue create --title "<type>(<scope>): <要約>" --body-file <ファイル> --label loop:ready` で起票する。
   複数起票するときは、先に着手すべきものから順に起票する。
6. 起票した Issue の番号・タイトル・URL、分けた場合はその理由と依存関係を報告する。
