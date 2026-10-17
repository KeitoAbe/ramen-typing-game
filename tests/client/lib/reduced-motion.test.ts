import { prefersReducedMotion } from "@/client/lib/reduced-motion";

describe("prefersReducedMotion", () => {
  it("動きを抑える設定のメディアクエリに当たれば true", () => {
    const queries: string[] = [];
    const target = {
      matchMedia: (query: string) => {
        queries.push(query);
        return { matches: true };
      },
    };
    expect(prefersReducedMotion(target)).toBe(true);
    expect(queries).toEqual(["(prefers-reduced-motion: reduce)"]);
  });

  it("当たらなければ false", () => {
    expect(
      prefersReducedMotion({ matchMedia: () => ({ matches: false }) }),
    ).toBe(false);
  });

  it("matchMedia が無い環境では false", () => {
    expect(prefersReducedMotion({})).toBe(false);
    expect(prefersReducedMotion(undefined)).toBe(false);
  });
});
