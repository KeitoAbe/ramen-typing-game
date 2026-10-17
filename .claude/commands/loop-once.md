---
allowed-tools: Bash(git:*), Bash(gh:*), Bash(pnpm:*)
description: ループを 1 tick だけ、この対話セッションの中で実行する（状態収集と判定はランナーに任せる）
---

# ループ: 1 tick を対話で試す

無人で回すときは `pnpm loop:once` / `pnpm loop <回数>` を使う。このコマンドは、同じ 1 tick を対話セッションの中で試すためのもの。
状態の収集と判定はランナーに任せ、選ばれた仕事だけをこのセッションで行う。

## 現在の状況

- ブランチ: !`git branch --show-current`
- 変更: !`git status --short`

## 手順

1. 作業ツリーに変更があれば、何もせずにその旨を伝えて終了する。なければ `git switch main && git pull --ff-only`。
2. `pnpm --silent loop:apply` を実行する。ランナーが判定し、ラベルの付け替えなどランナー側の書き込みだけを反映して、判定結果の JSON を出力する。
3. `action.kind` に応じて、対応するコマンドを Skill ツールでこのセッションの中で実行する。手順書を読んで真似するのではなく、コマンドとして呼ぶ。

   | action.kind | 実行するコマンド |
   |-------------|-----------------|
   | `implement` | `/loop-implement <action.issue>` |
   | `fix-ci` | `/loop-fix-ci <action.pr>` |
   | `resolve-coderabbit` | `/loop-resolve-coderabbit <action.pr>` |
   | `fix-main` | `/loop-fix-main` |
   | `wait` | 何もしない。待っている PR と Issue を伝えて終了する |
   | `none` | 何もしない。候補が無いことを伝えて終了する |

4. 実行したコマンドの結果行（`LOOP_RESULT: ...`）を最後にそのまま出力する。

CI や CodeRabbit の結果は待たない。次の tick（このコマンドの再実行）が状態の変化を拾う。
