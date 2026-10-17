import type { PersonalBestStorage } from "@/client/lib/ramen-personal-best";
import {
  loadSoundEnabled,
  SOUND_PATTERNS,
  SOUND_SETTING_STORAGE_KEY,
  saveSoundEnabled,
} from "@/client/lib/ramen-sound";

function memoryStorage(initial?: string): PersonalBestStorage {
  let value: string | null = initial ?? null;
  return {
    getItem: (key) => (key === SOUND_SETTING_STORAGE_KEY ? value : null),
    setItem: (key, next) => {
      if (key === SOUND_SETTING_STORAGE_KEY) value = next;
    },
  };
}

const brokenStorage: PersonalBestStorage = {
  getItem: () => {
    throw new Error("denied");
  },
  setItem: () => {
    throw new Error("denied");
  },
};

describe("loadSoundEnabled", () => {
  it("保存されていなければオン", () => {
    expect(loadSoundEnabled(memoryStorage())).toBe(true);
    expect(loadSoundEnabled(undefined)).toBe(true);
  });

  it("オフで保存されていればオフ", () => {
    expect(loadSoundEnabled(memoryStorage("off"))).toBe(false);
  });

  it("オンで保存されていればオン", () => {
    expect(loadSoundEnabled(memoryStorage("on"))).toBe(true);
  });

  it("読めなくても例外を投げず、オンとして扱う", () => {
    expect(loadSoundEnabled(brokenStorage)).toBe(true);
  });
});

describe("saveSoundEnabled", () => {
  it("保存した設定を読み直せる（リロード後も残る）", () => {
    const storage = memoryStorage();
    saveSoundEnabled(storage, false);
    expect(loadSoundEnabled(storage)).toBe(false);
    saveSoundEnabled(storage, true);
    expect(loadSoundEnabled(storage)).toBe(true);
  });

  it("保存できなくても例外を投げない", () => {
    expect(() => saveSoundEnabled(brokenStorage, false)).not.toThrow();
    expect(() => saveSoundEnabled(undefined, false)).not.toThrow();
  });
});

describe("SOUND_PATTERNS", () => {
  it.each([
    "correct",
    "miss",
    "served",
    "kaedama",
    "closed",
  ] as const)("%s では効果音が鳴る", (event) => {
    expect(SOUND_PATTERNS[event].length).toBeGreaterThan(0);
  });
});
