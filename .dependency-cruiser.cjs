/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    // ---------- テストの置き場所 ----------
    {
      name: "no-tests-in-src",
      comment:
        "テストは tests/ に src/ と同じ階層で置く。jest の roots は tests/ だけなので、" +
        "src/ 配下のテストは実行されず、落ちていても気づけない",
      severity: "error",
      from: { path: "^src/.*\\.(test|spec)\\.tsx?$" },
      to: {},
    },
    {
      name: "no-orphan-tests-in-src",
      comment:
        "import を持たないテストファイルは上のルールに掛からないので、orphan として別に検出する",
      severity: "error",
      from: { orphan: true, path: "^src/.*\\.(test|spec)\\.tsx?$" },
      to: {},
    },

    // ---------- client と server の境界 ----------
    {
      name: "no-client-to-server",
      comment:
        "client/ からサーバー処理を直接 import しない。データは Server Component か Server Action 経由で受け取る",
      severity: "error",
      from: { path: "^src/client" },
      to: { path: "^src/server" },
    },

    // ---------- レイヤー（docs/architecture.md） ----------
    {
      name: "no-domain-to-outer-layers",
      comment:
        "domain は application / presentation / infrastructure に依存しない",
      severity: "error",
      from: { path: "^src/server/contexts/[^/]+/domain" },
      to: {
        path: "^src/server/contexts/[^/]+/(application|presentation|infrastructure)",
      },
    },
    {
      name: "no-application-to-infrastructure",
      comment:
        "application は infrastructure の実装に依存しない。domain/repositories のインターフェースに依存し、" +
        "実装は presentation から注入する",
      severity: "error",
      from: { path: "^src/server/contexts/[^/]+/application" },
      to: { path: "^src/server/contexts/[^/]+/(infrastructure|presentation)" },
    },
    {
      name: "no-infrastructure-to-upper-layers",
      comment: "infrastructure は application / presentation に依存しない",
      severity: "error",
      from: { path: "^src/server/contexts/[^/]+/infrastructure" },
      to: { path: "^src/server/contexts/[^/]+/(application|presentation)" },
    },
    {
      name: "no-cross-context-internals",
      comment:
        "別の Bounded Context の内部に直接依存しない。共有するものは shared コンテキストに置く",
      severity: "error",
      from: { path: "^src/server/contexts/([^/]+)/" },
      to: {
        path: "^src/server/contexts/([^/]+)/",
        pathNot: ["^src/server/contexts/$1/", "^src/server/contexts/shared/"],
      },
    },

    // ---------- アプリとループの分離 ----------
    {
      name: "no-app-to-loop-runner",
      comment: "アプリのコードからループのランナー（scripts/）に依存しない",
      severity: "error",
      from: { path: "^src/" },
      to: { path: "^scripts/" },
    },
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
    tsPreCompilationDeps: true,
  },
};
