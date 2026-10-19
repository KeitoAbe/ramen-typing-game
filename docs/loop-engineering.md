# ループエンジニアリング

AI エージェント（Claude Code）に実装を自律的に回してもらうための運用ルール。
人間が毎回指示を出すのではなく、**指示を出す仕組みそのものを設計する**。人間は、仕組みの設計・タスクの供給・例外の判断を受け持つ。

このリポジトリのループは**ゴール収束型**で動く。`loop:ready` の Issue が無くなるか、指定回数に達するか、失敗が続いたら止まる。

## 構成

ループは、決定論的な**ランナー**と、使い捨ての **LLM セッション**の 2 層でできている。

| 層 | 実体 | 役割 |
|----|------|------|
| ランナー | `scripts/loop/`（TypeScript） | 状態の収集、次にやることの判定、予算の判定、人間への引き継ぎ、待機、セッションの結果の検証 |
| セッション | `.claude/commands/loop-*.md`（共通ルールは [loop-session-rules.md](loop-session-rules.md)） | 渡された 1 つの仕事だけをする（Issue の実装 / PR の CI 修理 / main の CI 修理 / CodeRabbit の指摘への対応） |

| ファイル | 役割 |
|---------|------|
| `scripts/loop/state.ts` | GitHub から状態を集める（読み取り専用） |
| `scripts/loop/decide.ts` | 状態から次にやることを決める純粋関数。挙動は `tests/scripts/loop/decide.test.ts` で固定している |
| `scripts/loop/escalate.ts` | セッションを起動せずにランナーが行う書き込み（ラベルの付け替え、再レビュー依頼、Request changes の取り下げ） |
| `scripts/loop/session.ts` | Claude Code を 1 回起動する。使ってよいツールを許可リストで限定する |
| `scripts/loop/tick.ts` | 1 tick の流れと、セッションの結果の検証 |
| `scripts/loop/runner.ts` | tick の繰り返しと停止条件 |

### 1 tick の判定順

上から順に確かめ、最初に当てはまったものを 1 つだけ実行する。

1. **main の CI が赤い**（main を直す PR がまだ無い） → `loop-fix-main`
2. **動かせる loop PR がある** → 必須チェックの失敗かコンフリクトなら `loop-fix-ci`。
   CodeRabbit が最新コミットをレビュー済みで、未解決のスレッドが残っていれば `loop-resolve-coderabbit`
3. **着手できる Issue がある** → `loop-implement`（`loop:unblock` を優先し、次に番号の小さいもの）
4. **結果待ちの PR か、依存待ちの Issue しか無い** → 待機。状態だけを取り直し、何か変わったら次の tick へ進む
5. **何も無い** → 終了

**新しいタスクより、すでにある成果物の修理を優先する。** 壊れた土台の上に積み上げないため。

**セッションは CI や CodeRabbit の結果を待たない。** push したら終了し、結果は次の tick で拾う。
ある PR のレビューを待っているあいだに、別の Issue を進められる。

**詰まったら止まる。順番待ちでは止まらない。** 修正の回数に上限を設け、超えたら人間に引き継ぐ。
一方、Issue 間の依存（本文の「#X のマージ後に着手」）は順番待ちなので、ラベルを変えずに読み飛ばす。

### セッションの起動と権限

セッションは毎回 `claude -p "/<コマンド> <引数>"` で新しく起動する。使ってよいツールは許可リストで限定している
（ファイルの読み書き、`git`、`gh`、`pnpm`）。許可リストに無い操作は、確認を求めずに拒否される。
さらに、force push、`git reset --hard`、リポジトリの削除や設定の変更、シークレットの操作などは明示的に禁止している。
一覧は `scripts/loop/session.ts` を参照。
セッションはユーザー設定（`~/.claude/settings.json`）を読まない（`--setting-sources project,local`）。
ユーザー設定の `ask` は `-p` では拒否として扱われ、許可リストと関係なくセッションが止まるため。

許可リストは安全性を高めるが、完全ではない。`pnpm` や `gh` を許可している以上、その範囲で書けるものは書ける。
**ランナーを動かすマシンの環境変数や `.env` に、本番の認証情報を置かない**（被害の上限がここで決まる）。

## 自動マージを安全に回すための前提

自動マージは、次の 5 つの境界で安全性を担保する。どれか 1 つでも欠けた状態でループを回さないこと。

1. **マージ権限は write 権限を持つ人だけ。** auto-merge を予約するのは、ループが自分で作った PR だけ。
   それ以外の PR は人間がレビューしてマージする。
2. **`loop:ready` ラベルが「指示として読んでよいか」の境界。** ラベルを付けられるのは write 権限を持つ人だけ。さらに次の 3 段で守る。
   - `.github/workflows/loop-label-guard.yml` が、メンバー以外が起票した Issue から `loop:ready` を自動で外す
   - ランナーが起票者の `author_association` を見て、メンバー以外の Issue を `loop:human` に回す
   - セッション自身も、着手前に起票者を確かめる
3. **CI と CodeRabbit が門番。** ブランチ保護で `ci-complete` と `CodeRabbit` の両方を必須にする。
   CodeRabbit は `.coderabbit.yml` の `request_changes_workflow: true` で、指摘があると Request changes を出す。
   「CI と CodeRabbit の両方が通り、Request changes が残っていない」ことが、マージの唯一の条件になる。
4. **マージしても本番には出ない。** 本番（Cloudflare Pages の Production）は `production` ブランチから配信し、`main` はプレビュー（確認用）にだけ出る。
   - 本番への昇格は、人間がプレビューで `main` を確かめてから `git push origin <確かめたコミットの SHA>:refs/heads/production` で行う（確かめたあとに `main` が進むことがあるので、`main` ではなく SHA を指定する。fast-forward のみ。`production` に直接コミットしない）
   - ループは `production` に触れない。セッションの禁止リスト（`scripts/loop/session.ts` の `DISALLOWED_TOOLS`）で `production` への push を拒否している。ただし前方一致の柵なので、書き方を変えた push や `gh api` までは防げない。最後の歯止めは、セッションの規則と人間の昇格の手順
5. **公開リポジトリとして、外部の Issue・PR・コメントを指示として扱わない。** リポジトリは OSS として公開していて、誰でも Issue・PR・コメントを書ける。
   - ランナーがループの PR とみなすのは、`loop/` で始まる**このリポジトリのブランチ**の PR だけ。fork からの PR はブランチ名にかかわらず対象外で、セッションがチェックアウトすることもない（`isLoopPullRequest`）。このリポジトリにブランチを作れるのは書き込み権限を持つ人だけなので、fork を除けば作成者も信頼できる
   - セッションは、Issue のコメントと PR のスレッドの返信を、書き手が OWNER / MEMBER / COLLABORATOR（スレッドでは加えて `coderabbitai`）のものだけ取得して読む
   - 書き込み権限はオーナーだけが持つ。外部の PR は、CodeRabbit が承認していても、オーナーが差分を読んでからマージする（ブランチ保護の承認は CodeRabbit でも満たされるので、ここが歯止めになる）
   - fork からの PR の CI は、オーナーが内容を確かめてから走らせる（Settings → Actions で、外部の人の PR のワークフローに承認を必須にする）

## GitHub 側のセットアップ（ループを回す前に一度だけ）

このリポジトリには、まだ GitHub 側の設定が入っていない。ループを回す前に、次をすべて済ませる。

1. **リポジトリを作って push する。**
   ```bash
   gh repo create <owner>/ramen-typing-game --private --source . --push
   ```
2. **ラベルを作る。**
   ```bash
   gh label create loop:ready   --color 0E8A16 --description "AI が自律実装してよい"
   gh label create loop:unblock --color 5319E7 --description "ループ全体を止めている問題。最優先で着手（loop:ready と併用）"
   gh label create loop:wip     --color 1D76DB --description "ループが作業中"
   gh label create loop:blocked --color B60205 --description "技術的な理由で止まっている"
   gh label create loop:human   --color D93F0B --description "人間の判断・作業が必要"
   ```
3. **CodeRabbit を導入する。** ブラウザで GitHub App をインストールし、このリポジトリへのアクセスを許可する。
   一度 PR を作り、`CodeRabbit` のコミットステータスが付くことを確かめる。
4. **auto-merge を許可する。** Settings → General → Pull Requests で「Allow auto-merge」を有効にする。
   あわせて「Automatically delete head branches」も有効にしておく。
5. **main にブランチ保護を設定する。** Settings → Rules（または Branches）で次を設定する。
   - 必須のステータスチェック: `ci-complete` と `CodeRabbit`
   - マージ前に PR のレビュー（承認 1 件）を必須にする（CodeRabbit の Request changes で auto-merge を止めるため）
   - force push と削除を禁止する
6. **確かめる。** `pnpm loop:state` と `pnpm loop:decide` を実行し、エラーなく JSON が出ることを確かめる。

## スコープアウトの原則

作業中に「これもやらなきゃ」と気づいたことは、**その場で実装せず Issue にする**。

- AI で実装できる → `loop:ready`（後続のループが拾う）
- 人間の判断が要る → `loop:human`
- ループ全体を止めている → `loop:ready` と `loop:unblock`（後続のループが最優先で拾う）

PR が大きくなりすぎず、自動マージできるサイズに収まる。見つけた課題も必ず Issue として残る。

## CodeRabbit の指摘の扱い

CodeRabbit は規約違反（レイヤーの境界、import の規約、テストの置き場所など）をかなり拾ってくれるので、ループの PR でも無視しない。
一方で、付き合うときりがない細かい指摘も多いので、セッションが妥当性を判断して「直す / 退ける / Issue にする」に振り分ける。
判断の基準は [.claude/commands/loop-resolve-coderabbit.md](../.claude/commands/loop-resolve-coderabbit.md) にある。

- 指摘を退けるときは、`🤖` で始まる理由を必ずスレッドに返信してから resolve する。返信なしの resolve やレビューの dismiss は、セッションには禁止している。
- 修正の push は **2 回まで**（`LOOP_MAX_FIX_ROUNDS`）。超えても未解決の指摘が残れば、ランナーが PR を open のまま `loop:human` に回す。
- **すべてのスレッドを resolve しても、Request changes が APPROVED に切り替わらないことがある。**
  最新コミットのレビューが済み、未解決のスレッドが無く、head のコミットとそのレビューのどちらも `LOOP_STALE_REVIEW_MINUTES`（既定 20 分）以上前なら、
  ランナーがそのレビューを取り下げ、理由を PR にコメントする。退けた根拠は各スレッドの 🤖 返信に残っている。
- **CodeRabbit には時間あたりのレビュー回数の上限がある。** 上限に当たると、コミットステータスは success のまま説明文が「rate limited」になり、
  そのコミットは未レビューのままになる。ランナーはこれを区別し、`@coderabbitai review` で再レビューを依頼する
  （head ごとに 1 回。`LOOP_NUDGE_INTERVAL_MINUTES`（既定 20 分）経っても未レビューなら再送）。
- ループが自動で扱うのは `coderabbitai` のスレッドだけ。人間のレビュースレッドがある PR は、ランナーがすぐに `loop:human` に回す。

## ラベル

| ラベル | 意味 | 付ける人 |
|--------|------|---------|
| `loop:ready` | AI が自律実装してよい。ループが拾う対象 | メンバー / ループ（スコープアウト時） |
| `loop:unblock` | ループ全体を止めている問題。最優先で着手する（`loop:ready` と併用） | メンバー / ループ |
| `loop:wip` | ループが作業中（二重着手を防ぐ） | セッション |
| `loop:blocked` | 環境や外部要因など、技術的な理由で止まっている（別 Issue のマージ待ちは含まない） | セッション |
| `loop:human` | 人間の判断・作業が必要 | メンバー / ランナー / セッション |

| 遷移 | きっかけ | 誰が |
|------|---------|------|
| `loop:ready` → `loop:wip` | 着手 | セッション |
| `loop:wip` → クローズ | PR がマージされた（`Closes #N`） | GitHub |
| `loop:wip` → `loop:ready` | 着手後に、本文に無い依存が分かった | セッション |
| `loop:wip` → `loop:blocked` | 技術的な問題 | セッション |
| `loop:wip` → `loop:human` | 人間の判断が必要 / 人間のレビューがある / 修正回数の上限を超えた | セッション / ランナー |
| `loop:ready` → `loop:human` | 起票者がメンバーでない / 依存先がマージされずに閉じた | ランナー |

依存が完了したとみなすのは、**依存先の成果物が main にマージされたとき**。Issue が閉じただけではマージを保証しないので、
ランナーは Issue を閉じた PR のマージ状態まで確かめる。

`loop:blocked` や `loop:human` を解消したら、メンバーが `loop:ready` に戻すと、再びループの対象になる。

## Issue の書き方（タスクの供給）

Issue テンプレート「Loop Task」を使う。要点は 3 つ。

1. **ユーザーに価値が届く縦切りで、1 PR で完結する。** server と client のような層では分けない。
2. **完了条件（Done）を検証できる形で書く。**（「〜のテストが通る」「〜の画面に〜が表示される」）
3. **やらないこと（Out of scope）を書く。** ループが範囲外に広がるのを防ぐ、いちばんの歯止め。

依存は本文に「#X のマージ後に着手」と書く（ランナーがこの文言をそのまま読むので、表記を変えない）。
**依存でつながった Issue ばかりだと、ループは 1 つずつしか進めない。** 互いに独立した Issue を混ぜておくと、待ち時間に別の Issue が進む。

Claude Code で `/loop-issue <やりたいことの概要>` を実行すると、コードを調べたうえで、上の要点を満たす Issue を起票できる。

## コマンド

```bash
pnpm loop:once                 # 1 tick だけ実行
pnpm loop 10                   # SUCCESS が 10 回になるまで回す（夜間バッチ向け）
pnpm loop 10 --model sonnet    # モデルを指定する（既定: opus。環境変数 LOOP_MODEL でも指定できる）

pnpm --silent loop:state       # いまの状態を見る（読み取り専用）
pnpm --silent loop:decide      # 次の tick が何をするかを見る（読み取り専用）
```

対話セッションの中で 1 tick を試すときは、Claude Code で `/loop-once` を実行する。
ログは `.loop/logs/` に残る（git の管理外。tick ごとの状態と判定の JSON も同じ場所に残る）。

### 停止条件

| 1 tick の結果 | 扱い |
|---------------|------|
| 成功 | SUCCESS の回数を 1 増やし、失敗とエスカレーションの連続回数を 0 に戻す。指定回数に達したら終了（`COMPLETED`） |
| 候補なし | すぐ終了（`NO_TASK`） |
| エスカレーション | 連続 3 回で終了（`ESCALATED_LIMIT`。系統的な問題を疑う） |
| 待機 | `LOOP_WAIT_SECONDS`（既定 60 秒）ごとに状態を取り直し、変化したら次の tick。変化しないまま `LOOP_MAX_WAIT_SECONDS`（既定 2 時間）で終了（`WAIT_TIMEOUT`） |
| 再実行しても直らない失敗 | すぐ終了（`FAILED_DETERMINISTIC`） |
| 一時的な失敗 | 連続 2 回で終了（`FAILED_LIMIT`） |
| 利用上限 | 成功にも失敗にも数えず、解除まで待ってから次の tick（下記） |

「連続」は文字どおりで、別の結果が出たらカウンタは 0 に戻る。安全弁として、試行回数が指定回数の 4 倍に達したら打ち切る（`ATTEMPT_LIMIT`）。

### 利用上限に当たったとき

セッションが Claude の利用上限で打ち切られると（出力の `You've hit your session limit · resets 12:20pm (Asia/Tokyo)` などで見分ける）、
ランナーは解除時刻に 1 分の余裕を足した時刻まで眠り、次の tick から再開する。上限で打ち切られたセッションは仕事をしていないので、
失敗の連続回数には数えない。

- 解除時刻が読み取れなければ、`LOOP_LIMIT_RETRY_SECONDS`（既定 30 分）待ってから試し直す
- 続けて待つ時間の合計が `LOOP_MAX_LIMIT_WAIT_SECONDS`（既定 6 時間）を超えるなら、待たずに終了する（`USAGE_LIMIT`）。
  セッションの上限は 5 時間の枠で戻るので 6 時間あれば足り、それより先の解除（週の上限など）は人間が判断する
- この待ちは、PR の結果待ちの上限（`LOOP_MAX_WAIT_SECONDS`）とは別に数える
- 文言が変わって見分けられなかったときは、これまでどおり一時的な失敗として扱う
- 実装のセッションが PR を作る前に打ち切られたら、Issue の `loop:wip` を `loop:ready` に戻し、理由をコメントする（そのままだと二度と着手されない）。
  PR まで作れていれば `loop:wip` のまま残し、続きは CI の修理や CodeRabbit への対応で拾う

### 作業ツリーが中途半端なとき

tick の始めに、前のセッションが残した作業を片付けてから main に戻る。

- `loop/*` のブランチで、マージ・リベース・cherry-pick が途中なら `--abort` で取り消す（セッションがコンフリクトの解消中に打ち切られると残る）。
  取り消した後も変更が残っていれば、`loop-abandoned:` の名前で `git stash` に退避する
- main に戻ったあと、取り込み済み（独自のコミットがない）ローカルの `loop/*` ブランチを `git branch -d` で消す。
  打ち切られたセッションのブランチが残ると、同じ Issue に着手し直すときに同じ名前のブランチを作れないため。独自のコミットがあるブランチは残る
- `loop/*` 以外のブランチで作業ツリーが汚れているか、操作が途中なら、人間の作業を壊さないよう何もせずに終了する（`FAILED_DETERMINISTIC`）
- 片付けの git の操作が失敗しても、ランナーは落ちずに一時的な失敗として扱う

ランナーはセッションの「SUCCESS」を鵜呑みにせず、GitHub 側で確かめる
（実装なら `loop/issue-<N>-*` の PR が open か、CI 修理なら head が進んだか、レビュー対応なら未解決の CodeRabbit スレッドが 0 か）。
確かめられなければ、一時的な失敗として扱う。

## 人間の役割

```bash
gh pr list --state merged --limit 20   # マージされた PR → コードを読んで理解する
gh issue list --label loop:human       # 判断待ち → 判断したら loop:ready に戻す
gh issue list --label loop:blocked     # 技術的な問題 → 解消したら loop:ready に戻す
gh issue list --label loop:wip         # PR が無いのに残っていたら、異常終了の痕跡
git stash list | grep loop-abandoned   # 中断したセッションが退避した作業
```

**マージされた PR も必ず読むこと。** 自動マージが保証するのは「CI と CodeRabbit が通った」ことだけ。
コードを読まずに積み上げると、中身を誰も理解していない状態（Comprehension Debt）が溜まり、いずれ設計の判断ができなくなる。
ループが CodeRabbit の指摘を**退けた理由**（PR の「🤖 CodeRabbit の指摘への対応」と各スレッドの 🤖 返信）にも目を通し、
判断が甘ければ判断の基準を直す。

## ループの仕組みそのものの変更

`scripts/loop/`、`tests/scripts/loop/`、`.claude/commands/loop-*.md`、`docs/loop-*.md`、`.github/workflows/` の変更は、
ループに任せず人間が行う。セッションが自分の判定順や信頼の境界を書き換えられないよう、共通ルールでもこれらの編集を禁止している。

コマンドの手順書（`.claude/commands/loop-*.md`）の「現在の状況」にある `!` コマンドは、1 つでも失敗すると Claude が 0 ターンで終了する
（ランナーは `session-not-started` で止まる）。`!` コマンドを変えたら、`claude -p "/loop-<コマンド> <引数>" --max-turns 1` で展開が通ることを確かめる。

## 注意

- **コンフリクト**: 続けて動くセッションが同じファイルを触ると、auto-merge が失敗する（ランナーが `loop-fix-ci` で解消を試みる）。
  関係の深いタスクは 1 つの Issue にまとめるか、本文に「#X のマージ後に着手」と書く。
- **コスト**: 1 tick ごとに 1 セッション分のトークンを使う。回数の指定は残りのタスク数に合わせる（多めに指定しても、タスクが無くなれば止まる）。
- **DB を導入するとき**: スキーマの変更は、PR のレビューでは手遅れになることがある（開発環境に自動で適用される構成の場合）。
  導入時に、「人間が Issue の段階で承認したマイグレーションだけをループに実装させる」ルールとラベルを追加すること。
