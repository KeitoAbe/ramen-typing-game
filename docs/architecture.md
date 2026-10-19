# アーキテクチャ

アプリのコード構成とレイヤーのルール。依存の向きは dependency-cruiser（`pnpm depcruise`）で検査し、違反すると CI が落ちる。

## ディレクトリ構成

```
src/
├── app/                 # App Router のルーティング、ページ、Route Handler
├── client/
│   ├── components/      # React コンポーネント
│   └── lib/             # クライアントで動くヘルパー
├── server/contexts/
│   └── {コンテキスト名}/  # Bounded Context ごとに分ける
└── types/               # アプリ全体で共有する型
tests/                   # src/ や scripts/ と同じ階層でテストを置く
scripts/loop/            # ループのランナー（アプリのコードからは参照しない）
```

## Bounded Context の構成

```
src/server/contexts/{コンテキスト名}/
├── presentation/
│   ├── loaders/         # Server Component から呼ぶデータ取得
│   └── actions/         # Server Action（"use server"）。副作用のある操作だけ
├── application/
│   └── usecases/        # loader や action から呼ぶユースケース
├── domain/
│   ├── models/          # ドメインモデル
│   ├── services/        # 複数のモデルにまたがる処理
│   └── repositories/    # リポジトリのインターフェース
└── infrastructure/
    └── repositories/    # リポジトリの実装（外部 API、DB など）
```

コンテキストをまたいで共有するものは `src/server/contexts/shared/` に置く。

## 依存のルール

| from | 依存してよい | 依存しない |
|------|-------------|-----------|
| `presentation` | `application`、`domain`、`infrastructure`（実装を組み立てて注入する） | — |
| `application` | `domain` | `infrastructure`、`presentation` |
| `domain` | なし（同じ `domain` の中だけ） | `application`、`presentation`、`infrastructure` |
| `infrastructure` | `domain`（インターフェースを実装する） | `application`、`presentation` |
| `src/client` | `src/types` など | `src/server` |
| `src/` | — | `scripts/` |

別のコンテキストの内部には直接依存しない（`shared` は除く）。

## Next.js のルール

- データの取得は、なるべく Server Component で行う。取得処理は `presentation/loaders` に切り出す。
- `"use client"` は、状態管理・ブラウザ API・重い UI ライブラリなど、クライアントで動く必然性があるときだけ使う。
- サーバーでだけ動く処理には `import "server-only"` を書き、誤ってクライアントから参照されないようにする。
- Server Action は、データの更新やファイルのアップロードなど副作用のある操作だけに使い、`revalidatePath` や `revalidateTag` による再検証までをセットで行う。
- static export（`output: "export"`）で静的ファイルを出力して配信する。Server Action・cookies・リクエストを読む Route Handler など、サーバーで動く機能は使えない。
  Route Handler とメタデータのルート（`robots.ts`・`opengraph-image.tsx` など）には `export const dynamic = "force-static"` を書く。
- このリポジトリの Next.js は新しい版で、学習データと API が違うことがある。書く前に `node_modules/next/dist/docs/` の該当ガイドを読む（[AGENTS.md](../AGENTS.md)）。
