import { waitingKeyAction } from "@/client/lib/ramen-waiting";

/** 半角英数で、修飾キーなしに 1 回押したキー */
function keyOf(key: string, overrides: Partial<KeyboardEvent> = {}) {
  return {
    key,
    isComposing: false,
    keyCode: 0,
    repeat: false,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    ...overrides,
  };
}

describe("waitingKeyAction", () => {
  it("スペースか Enter で始める", () => {
    expect(waitingKeyAction(keyOf(" "))).toBe("open");
    expect(waitingKeyAction(keyOf("Enter"))).toBe("open");
  });

  it("スペース・Enter 以外のキーでは何もしない", () => {
    for (const key of ["a", "1", "Escape", "Tab", "ArrowDown", "Shift"]) {
      expect(waitingKeyAction(keyOf(key))).toBe("ignore");
    }
  });

  it("押しっぱなしで繰り返されたキーでは始めない", () => {
    expect(waitingKeyAction(keyOf("Enter", { repeat: true }))).toBe("ignore");
  });

  it("修飾キーと一緒に押したときは始めない", () => {
    expect(waitingKeyAction(keyOf("Enter", { ctrlKey: true }))).toBe("ignore");
    expect(waitingKeyAction(keyOf(" ", { metaKey: true }))).toBe("ignore");
    expect(waitingKeyAction(keyOf("Enter", { altKey: true }))).toBe("ignore");
  });

  it("IME がオンのまま押したキーは、始めずに案内を出す", () => {
    expect(waitingKeyAction(keyOf(" ", { keyCode: 229 }))).toBe("ime");
    expect(waitingKeyAction(keyOf("Enter", { isComposing: true }))).toBe("ime");
    expect(waitingKeyAction(keyOf("Process"))).toBe("ime");
  });
});
