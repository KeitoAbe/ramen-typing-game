import {
  createTypingState,
  inputKey,
  isComplete,
  remainingRomaji,
  type TypingState,
  typedRomaji,
} from "@/client/lib/romaji/typing";

/** keys を順に打ち、すべて受け付けられたら最後の状態を返す。弾かれたら null */
function typeKeys(reading: string, keys: string): TypingState | null {
  let state = createTypingState(reading);
  for (const key of keys) {
    const result = inputKey(state, key);
    if (!result.accepted) return null;
    state = result.state;
  }
  return state;
}

function canType(reading: string, keys: string): boolean {
  const state = typeKeys(reading, keys);
  return state !== null && isComplete(state);
}

describe("複数のつづり", () => {
  it.each([
    ["し", ["shi", "si"]],
    ["ち", ["chi", "ti"]],
    ["つ", ["tsu", "tu"]],
    ["ふ", ["fu", "hu"]],
    ["じ", ["ji", "zi"]],
  ])("%s を %j のどれでも打てる", (reading, spellings) => {
    for (const keys of spellings) {
      expect(canType(reading, keys)).toBe(true);
    }
  });

  it.each([
    ["しゃ", ["sha", "sya", "shixya", "silya"]],
    ["しゅ", ["shu", "syu"]],
    ["しょ", ["sho", "syo", "shixyo"]],
    ["ちゃ", ["cha", "tya", "cya", "chixya"]],
    ["じゃ", ["ja", "zya", "jya", "jixya"]],
    ["きょ", ["kyo", "kixyo"]],
  ])("拗音 %s を %j のどれでも打てる", (reading, spellings) => {
    for (const keys of spellings) {
      expect(canType(reading, keys)).toBe(true);
    }
  });

  it("長音「ー」は - で打つ", () => {
    expect(canType("らーめん", "ra-menn")).toBe(true);
  });
});

describe("ん", () => {
  it.each(["nn", "n'"])("末尾の「ん」は %s で打てる", (keys) => {
    expect(canType("みかん", `mika${keys}`)).toBe(true);
  });

  it("末尾の「ん」は n 1 打では打ち終わらない", () => {
    const state = typeKeys("みかん", "mikan");
    expect(state).not.toBeNull();
    expect(isComplete(state as TypingState)).toBe(false);
    expect(remainingRomaji(state as TypingState)).toBe("n");
  });

  it("子音の前の「ん」は n 1 打でもよい", () => {
    expect(canType("めんま", "menma")).toBe(true);
    expect(canType("とんこつ", "tonkotsu")).toBe(true);
    expect(canType("とんこつ", "tonnkotsu")).toBe(true);
    expect(canType("ぴんぐ", "pingu")).toBe(true);
  });

  it.each([
    ["こんいろ", "konniro", "koniro"],
    ["こんあい", "konnai", "konai"],
    ["こんにゃく", "konnnyaku", "konnyaku"],
    ["こんな", "konnna", "konna"],
    ["こんや", "konnya", "konya"],
  ])("母音・な行・や行の前の「ん」(%s) は nn が要る", (reading, ok, ng) => {
    expect(canType(reading, ok)).toBe(true);
    expect(canType(reading, ng)).toBe(false);
  });

  it("n' でも打てる", () => {
    expect(canType("こんや", "kon'ya")).toBe(true);
  });
});

describe("促音（っ）", () => {
  it.each([
    ["とっぴんぐ", "toppingu"],
    ["あっさり", "assari"],
    ["こってり", "kotteri"],
    ["まっちゃ", "maccha"],
    ["まっちゃ", "mattya"],
  ])("%s は次の子音を重ねて %s で打てる", (reading, keys) => {
    expect(canType(reading, keys)).toBe(true);
  });

  it.each(["ltu", "xtu", "ltsu", "xtsu"])("%s で単独でも打てる", (sokuon) => {
    expect(canType("あっさり", `a${sokuon}sari`)).toBe(true);
  });

  it("重ねる子音が次の文字と合わなければ弾く", () => {
    expect(typeKeys("あっさり", "akk")).toBeNull();
  });
});

describe("キーの判定", () => {
  it("正しいキーでは進み、間違えたキーでは進まない", () => {
    const state = createTypingState("しお");
    const ok = inputKey(state, "s");
    expect(ok.accepted).toBe(true);
    expect(typedRomaji(ok.state)).toBe("s");

    const ng = inputKey(ok.state, "a");
    expect(ng.accepted).toBe(false);
    expect(ng.state).toBe(ok.state);
  });

  it("打ち終えると isComplete になる", () => {
    expect(isComplete(createTypingState("しお"))).toBe(false);
    expect(canType("しお", "shio")).toBe(true);
  });
});

describe("残りのローマ字の表示", () => {
  it("最初は先頭のつづりで表示する", () => {
    expect(remainingRomaji(createTypingState("しょうゆ"))).toBe("shouyu");
    expect(remainingRomaji(createTypingState("とっぴんぐ"))).toBe("toppingu");
    expect(remainingRomaji(createTypingState("みかん"))).toBe("mikann");
  });

  it("途中で別のつづりに切り替えると、表示もそれに合わせて変わる", () => {
    // し で s のあと h を打たずに i
    const s = typeKeys("しお", "s") as TypingState;
    expect(remainingRomaji(s)).toBe("hio");
    const si = typeKeys("しお", "si") as TypingState;
    expect(typedRomaji(si)).toBe("si");
    expect(remainingRomaji(si)).toBe("o");

    const t = typeKeys("ちゃ", "t") as TypingState;
    expect(remainingRomaji(t)).toBe("ya");

    const shi = typeKeys("しゃ", "shi") as TypingState;
    expect(remainingRomaji(shi)).toBe("xya");

    const l = typeKeys("あっさり", "al") as TypingState;
    expect(remainingRomaji(l)).toBe("tusari");
  });

  it("打ち終えたら空になる", () => {
    expect(remainingRomaji(typeKeys("しお", "shio") as TypingState)).toBe("");
  });
});
