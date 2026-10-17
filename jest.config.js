/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  // テストは tests/ に、src/ や scripts/ と同じ階層で置く。src/ 配下のテストは収集しない
  // （置かれた場合は dependency-cruiser の no-tests-in-src で CI が落ちる）
  roots: ["<rootDir>/tests"],
  // watchman が壊れた環境で 1 件も収集せずに素通りするのを防ぐ
  watchman: false,
  testMatch: ["**/*.test.ts", "**/*.test.tsx"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: { jsx: "react-jsx" } }],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@scripts/(.*)$": "<rootDir>/scripts/$1",
  },
};
