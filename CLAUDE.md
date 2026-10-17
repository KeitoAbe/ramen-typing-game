# Claude Code 設定

@AGENTS.md

## ドキュメントの読み方（最初に読むこと）

作業ルールや仕様を探す前に [docs/README.md](docs/README.md) を読み、どれを根拠にしてよいかを確認する。
現行の根拠にしてよいのは `docs/` 直下の正本だけで、`docs/notes/` は書いた時点の記録。

## アプリケーション概要

タイピングゲーム。ループエンジニアリング（AI エージェントによる自律実装）で開発する。

<!-- TODO: アプリの概要（対象ユーザー・主な機能）が決まったら書く -->

- 技術スタック: Next.js 16（App Router）/ React 19 / TypeScript / Tailwind CSS 4 / pnpm
- DB・認証・デプロイはまだ導入していない

## コード構成

[docs/architecture.md](docs/architecture.md) を参照する。要点:

- `src/server/contexts/{コンテキスト名}/` に Bounded Context ごとのレイヤー（presentation / application / domain / infrastructure）を置く
- 依存の向きは dependency-cruiser で検査している

## 実装ルール

- データの取得はなるべく Server Component に寄せ、取得処理は loaders に切り出す
- クライアントで動く必然性がない限り `"use client"` を使わない
- サーバーでだけ動く処理には `import "server-only"` を書く
- Server Action は副作用のある操作だけに使い、再検証（`revalidatePath` など）までをセットで行う
- import は `@/` から始まる絶対パスで書く（相対パスは使わない）。テストから `scripts/` を参照するときは `@scripts/` を使う

## テスト

- ユニットテストは `tests/` に、`src/` や `scripts/` と同じ階層で置く（例: `src/client/lib/format.ts` → `tests/client/lib/format.test.ts`）
- **`src/` 配下に `*.test.ts(x)` を置かない。** jest は `tests/` しか見ないので実行されず、dependency-cruiser が検出して CI を落とす

## 確認コマンド

```bash
pnpm verify   # lint / typecheck / test / depcruise / knip（pre-push フックでも実行される）
pnpm build    # 本番ビルド
```

## ループエンジニアリング

`loop:ready` ラベルの付いた Issue を AI エージェントが自律実装し、CI と CodeRabbit が通れば自動マージする運用を行う。

- 運用ルール: [docs/loop-engineering.md](docs/loop-engineering.md)
- セッション共通の規則: [docs/loop-session-rules.md](docs/loop-session-rules.md)
- 各セッションの手順: `.claude/commands/loop-implement.md` / `loop-fix-ci.md` / `loop-fix-main.md` / `loop-resolve-coderabbit.md`
- ループ向けの Issue の起票: [.claude/commands/loop-issue.md](.claude/commands/loop-issue.md)
