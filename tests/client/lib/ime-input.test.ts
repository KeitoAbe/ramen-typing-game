import { isImeKeyInput } from "@/client/lib/ime-input";

describe("isImeKeyInput", () => {
  it("key が Process なら IME の入力とみなす", () => {
    expect(
      isImeKeyInput({ key: "Process", isComposing: false, keyCode: 0 }),
    ).toBe(true);
  });

  it("isComposing が true なら、key が英字でも IME の入力とみなす", () => {
    expect(isImeKeyInput({ key: "a", isComposing: true, keyCode: 65 })).toBe(
      true,
    );
  });

  it("keyCode が 229 なら IME の入力とみなす", () => {
    expect(
      isImeKeyInput({ key: "Unidentified", isComposing: false, keyCode: 229 }),
    ).toBe(true);
  });

  it("半角英数で打ったキーは IME の入力とみなさない", () => {
    expect(isImeKeyInput({ key: "a", isComposing: false, keyCode: 65 })).toBe(
      false,
    );
  });
});
