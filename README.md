# typing-game

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
