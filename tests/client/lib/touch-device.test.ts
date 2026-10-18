import {
  isTouchPrimaryDevice,
  TOUCH_PRIMARY_QUERY,
} from "@/client/lib/touch-device";

/** 当たるメディアクエリを決めた matchMedia を持つ、window の代わり */
function targetMatching(matchingQueries: readonly string[]) {
  return {
    matchMedia: (query: string) => ({
      matches: matchingQueries.includes(query),
    }),
  };
}

describe("isTouchPrimaryDevice", () => {
  it("マウスを載せられず指で触る端末（スマホ・タブレット）なら true", () => {
    expect(isTouchPrimaryDevice(targetMatching([TOUCH_PRIMARY_QUERY]))).toBe(
      true,
    );
  });

  it("マウスとキーボードの PC なら false", () => {
    expect(isTouchPrimaryDevice(targetMatching([]))).toBe(false);
  });

  it("タッチ画面の付いた PC でも、主な入力がマウスなら当たらないクエリを使う", () => {
    expect(TOUCH_PRIMARY_QUERY).toBe("(hover: none) and (pointer: coarse)");
  });

  it("matchMedia が無い環境（サーバーなど）では false", () => {
    expect(isTouchPrimaryDevice({})).toBe(false);
    expect(isTouchPrimaryDevice(undefined)).toBe(false);
  });
});
