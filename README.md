# ramen-typing-game

タイピングゲーム。ループエンジニアリング（AI エージェントが Issue を自律実装し、CI と CodeRabbit が通れば自動マージする開発手法）で開発する。

## 必要なもの

- Node.js 24 以上
- pnpm 10
- [GitHub CLI](https://cli.github.com/)（`gh auth login` 済み）
- [Claude Code](https://claude.com/claude-code)（ループを回すマシンのみ）

## はじめかた

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm verify     # lint / typecheck / test / depcruise / knip
pnpm build      # 本番ビルド
```

## 環境変数

| 名前 | 用途 | 未設定のとき |
|------|------|-------------|
| `NEXT_PUBLIC_CONTACT_FORM_URL` | お問い合わせページ（`/contact`）から新しいタブで開く Google フォームの URL | リンクを出さずに「準備中」と出す |

`NEXT_PUBLIC_` の変数は**ビルド時に値が埋め込まれる**。ホスティング（AWS Amplify など）のコンソールで設定し、変えたら再ビルドする。
ローカルでは `.env.local` に書く。

## ループを回す

GitHub 側の設定（ラベル、CodeRabbit、ブランチ保護、auto-merge）が済んでいないと、ループは安全に回せない。
先に [docs/loop-engineering.md](docs/loop-engineering.md) の「GitHub 側のセットアップ」を済ませること。

```bash
pnpm --silent loop:decide   # 次に何をするかを確かめる（読み取り専用）
pnpm loop:once              # 1 tick だけ実行
pnpm loop 10                # SUCCESS が 10 回になるまで回す
```

タスクは Claude Code で `/loop-issue <やりたいこと>` を実行して起票する。

## ドキュメント

[docs/README.md](docs/README.md) から読む。
