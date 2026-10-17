// gh CLI の薄いラッパー。シェルを介さず引数配列で渡すので、`{owner}` などの波括弧や
// 本文中の記号がシェルに展開される心配がない。

import { execFileSync } from "node:child_process";

export function gh(args: string[]): string {
  return execFileSync("gh", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
  });
}

export function ghJson<T>(args: string[]): T {
  return JSON.parse(gh(args)) as T;
}

export function graphql<T>(query: string): T {
  return ghJson<{ data: T }>(["api", "graphql", "-f", `query=${query}`]).data;
}

/**
 * 部分的なエラーを許す GraphQL 呼び出し。存在しない番号を含むクエリでも、
 * GitHub は取れた分の data を返すので、それをそのまま使う。
 */
export function graphqlPartial<T>(query: string): Partial<T> {
  try {
    return graphql<T>(query);
  } catch (error) {
    const stdout = (error as { stdout?: string }).stdout ?? "";
    try {
      return (JSON.parse(stdout) as { data?: Partial<T> }).data ?? {};
    } catch {
      return {};
    }
  }
}

export function git(args: string[]): string {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}
