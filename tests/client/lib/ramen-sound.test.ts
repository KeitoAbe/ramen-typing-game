import type { RamenGameEvent } from "@/client/lib/ramen-events";
import type { PersonalBestStorage } from "@/client/lib/ramen-personal-best";
import {
  loadSoundEnabled,
  resolveSoundLayers,
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

/** 鳴り終わるまでの長さ（秒） */
function soundLength(event: RamenGameEvent): number {
  return Math.max(
    ...SOUND_PATTERNS[event].layers.map(
      (layer) => layer.delay + layer.duration,
    ),
  );
}

/** 層の音量の合計。すべての層が同時に最大になったときの大きさ（最悪の場合）とみなす */
function totalVolume(event: RamenGameEvent): number {
  return SOUND_PATTERNS[event].layers.reduce(
    (sum, layer) => sum + layer.volume,
    0,
  );
}

const PLAYED_EVENTS = [
  "correct",
  "miss",
  "served",
  "kaedama",
  "closed",
] as const;

describe("SOUND_PATTERNS", () => {
  it.each(
    PLAYED_EVENTS,
  )("%s では、発振器 1 つだけでなく複数の層を重ねた効果音が鳴る", (event) => {
    expect(SOUND_PATTERNS[event].layers.length).toBeGreaterThan(1);
  });

  it.each(
    PLAYED_EVENTS,
  )("%s では、木や打楽器の質感を出すノイズの層を使う", (event) => {
    expect(
      SOUND_PATTERNS[event].layers.some((layer) => layer.kind === "noise"),
    ).toBe(true);
  });

  it("丼を下げられたときは鳴らさない", () => {
    expect(SOUND_PATTERNS.discarded.layers).toHaveLength(0);
  });

  it.each([
    ["correct", 0.05],
    ["miss", 0.15],
    ["served", 0.4],
    ["kaedama", 0.5],
    ["closed", 1.2],
  ] as const)("%s は %f 秒以内に鳴り終わる", (event, limit) => {
    expect(soundLength(event)).toBeLessThanOrEqual(limit);
  });

  it("閉店は拍子木を 2 回打つ（鳴り始めが 2 つある）", () => {
    const starts = new Set(
      SOUND_PATTERNS.closed.layers.map((layer) => layer.delay),
    );
    expect(starts.size).toBe(2);
  });

  it("すべての層は、音量が 0 より大きく、立ち上がりが鳴る長さより短い", () => {
    for (const event of PLAYED_EVENTS) {
      for (const layer of SOUND_PATTERNS[event].layers) {
        expect(layer.volume).toBeGreaterThan(0);
        expect(layer.attack).toBeGreaterThan(0);
        expect(layer.attack).toBeLessThan(layer.duration);
      }
    }
  });

  it("すべての音が同時に鳴っても、音量の合計が 1.0 を超えない", () => {
    const sum = PLAYED_EVENTS.reduce(
      (total, event) => total + totalVolume(event),
      0,
    );
    expect(sum).toBeLessThanOrEqual(1);
  });

  it("正しく打ったときの音は、平らげたときの音の半分以下の大きさ", () => {
    expect(totalVolume("correct")).toBeLessThanOrEqual(
      totalVolume("served") / 2,
    );
  });

  it("正しく打ったときの音は、ほかのどの音よりも小さい", () => {
    for (const event of PLAYED_EVENTS) {
      if (event === "correct") continue;
      expect(totalVolume("correct")).toBeLessThan(totalVolume(event));
    }
  });
});

describe("resolveSoundLayers", () => {
  const variation = SOUND_PATTERNS.correct.pitchVariation;

  it("正しく打ったときの音は、高さを揺らす（揺らぎの幅は ±10% 以内）", () => {
    expect(variation).toBeGreaterThan(0);
    expect(variation).toBeLessThanOrEqual(0.1);
  });

  it("正しく打ったときの音は、乱数によって高さが変わる", () => {
    const low = resolveSoundLayers("correct", () => 0);
    const high = resolveSoundLayers("correct", () => 0.999);
    expect(low).not.toEqual(high);
  });

  it.each([
    0, 0.5, 0.999,
  ])("乱数が %f のとき、高さの揺らぎは幅の内側に収まる", (value) => {
    const resolved = resolveSoundLayers("correct", () => value);
    SOUND_PATTERNS.correct.layers.forEach((base, index) => {
      const layer = resolved[index];
      const [baseFrequency, frequency] =
        base.kind === "tone" && layer.kind === "tone"
          ? [base.frequency, layer.frequency]
          : base.kind === "noise" && layer.kind === "noise"
            ? [base.filterFrequency, layer.filterFrequency]
            : [Number.NaN, Number.NaN];
      const ratio = frequency / baseFrequency;
      expect(ratio).toBeGreaterThanOrEqual(1 - variation - 1e-9);
      expect(ratio).toBeLessThanOrEqual(1 + variation + 1e-9);
    });
  });

  it("高さを揺らしても、長さと音量は変えない", () => {
    const resolved = resolveSoundLayers("correct", () => 0.999);
    SOUND_PATTERNS.correct.layers.forEach((base, index) => {
      expect(resolved[index].duration).toBe(base.duration);
      expect(resolved[index].volume).toBe(base.volume);
      expect(resolved[index].delay).toBe(base.delay);
    });
  });

  it("揺らぎを持たない音は、定義のまま鳴らす", () => {
    expect(resolveSoundLayers("closed", () => 0)).toBe(
      SOUND_PATTERNS.closed.layers,
    );
  });
});
