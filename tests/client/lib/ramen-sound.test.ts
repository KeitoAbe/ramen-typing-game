import type { PersonalBestStorage } from "@/client/lib/ramen-personal-best";
import {
  createSoundPlayer,
  loadSoundEnabled,
  PERSONAL_BEST_AFTER_STAMP_SECONDS,
  resolveSoundLayers,
  SOUND_PATTERNS,
  SOUND_SETTING_STORAGE_KEY,
  type SoundCue,
  STAMP_LANDING_SECONDS,
  saveSoundEnabled,
} from "@/client/lib/ramen-sound";

type SoundLayer = (typeof SOUND_PATTERNS)[SoundCue]["layers"][number];

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
function soundLength(event: SoundCue): number {
  return Math.max(
    ...SOUND_PATTERNS[event].layers.map(
      (layer) => layer.delay + layer.duration,
    ),
  );
}

/** 層の音量の合計。すべての層が同時に最大になったときの大きさ（最悪の場合）とみなす */
function totalVolume(event: SoundCue): number {
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

  it("今ある 5 つの音が同時に鳴っても、音量の合計が 1.0 を超えない", () => {
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

/** 鳴らし始めを offset 秒ずらした層 */
function layersAt(cue: SoundCue, offset = 0) {
  return SOUND_PATTERNS[cue].layers.map((layer) => ({
    ...layer,
    delay: layer.delay + offset,
  }));
}

/**
 * 重なって鳴る層の音量の合計の最大値。
 * 層はすべて立ち上がってから減衰するので、ある時刻の大きさは、そのとき鳴っている層の最大の音量の合計を超えない。
 * 鳴っている層が増えるのは層の鳴り始めだけなので、鳴り始めの時刻だけを調べればよい
 */
function peakVolume(layers: readonly SoundLayer[]): number {
  return Math.max(
    ...layers.map(({ delay: time }) =>
      layers
        .filter(
          (layer) => layer.delay <= time && time < layer.delay + layer.duration,
        )
        .reduce((sum, layer) => sum + layer.volume, 0),
    ),
  );
}

describe("SOUND_PATTERNS（足した 7 つの場面）", () => {
  const ADDED_CUES = [
    "ticket",
    "opened",
    "specialBowl",
    "streakUp1",
    "streakUp2",
    "streakUp3",
    "closingRush",
    "stamp",
    "personalBest",
  ] as const;

  it.each([
    ["ticket", 0.6],
    ["opened", 0.4],
    ["specialBowl", 0.5],
    ["streakUp1", 0.5],
    ["streakUp2", 0.5],
    ["streakUp3", 0.5],
    ["closingRush", 0.8],
    ["stamp", 0.3],
    ["personalBest", 1.0],
  ] as const)("%s は %f 秒以内に鳴り終わる", (cue, limit) => {
    expect(soundLength(cue)).toBeLessThanOrEqual(limit);
  });

  it.each(ADDED_CUES)("%s は複数の層を重ねた音が鳴る", (cue) => {
    expect(SOUND_PATTERNS[cue].layers.length).toBeGreaterThan(1);
  });

  it("すべての層は、音量が 0 より大きく、立ち上がりが鳴る長さより短い", () => {
    for (const cue of ADDED_CUES) {
      for (const layer of SOUND_PATTERNS[cue].layers) {
        expect(layer.volume).toBeGreaterThan(0);
        expect(layer.attack).toBeGreaterThan(0);
        expect(layer.attack).toBeLessThan(layer.duration);
      }
    }
  });

  it.each(
    ADDED_CUES,
  )("%s は 1 つだけでも、正しく打ったときの音より大きく聞こえる", (cue) => {
    expect(peakVolume(layersAt(cue))).toBeGreaterThan(
      peakVolume(layersAt("correct")),
    );
  });

  it("食券は、ボタンのカチッのあとに、券が出てくるガシャンが鳴る（鳴り始めが 2 つある）", () => {
    const starts = new Set(
      SOUND_PATTERNS.ticket.layers.map((layer) => layer.delay),
    );
    expect(starts.size).toBe(2);
  });

  it("いただきますは、拍子木を 1 回だけ打つ（閉店と同じ拍子木の音を使う）", () => {
    const starts = new Set(
      SOUND_PATTERNS.opened.layers.map((layer) => layer.delay),
    );
    expect(starts.size).toBe(1);
    expect(SOUND_PATTERNS.opened.layers.map((layer) => layer.kind)).toEqual(
      SOUND_PATTERNS.closed.layers.slice(0, 3).map((layer) => layer.kind),
    );
  });

  it("閉店間際は、閉店より速く、3 回以上拍子木を打つ", () => {
    const starts = [
      ...new Set(SOUND_PATTERNS.closingRush.layers.map((layer) => layer.delay)),
    ];
    expect(starts.length).toBeGreaterThanOrEqual(3);
    const interval = starts[1] - starts[0];
    expect(interval).toBeLessThan(0.45);
  });

  it("特別な丼は、高い音（2000Hz 以上）の鈴が鳴る", () => {
    const frequencies = SOUND_PATTERNS.specialBowl.layers.flatMap((layer) =>
      layer.kind === "tone" ? [layer.frequency] : [],
    );
    expect(Math.min(...frequencies)).toBeGreaterThanOrEqual(2000);
  });

  it("判子は、低く鈍い音（いちばん大きい層が 200Hz 以下）", () => {
    const loudest = SOUND_PATTERNS.stamp.layers.reduce((a, b) =>
      a.volume >= b.volume ? a : b,
    );
    expect(loudest.kind).toBe("tone");
    if (loudest.kind === "tone") {
      expect(loudest.frequency).toBeLessThanOrEqual(200);
    }
  });

  it("自己ベスト更新は、鳴る順に音が高くなっていく（上昇するファンファーレ）", () => {
    const melody = SOUND_PATTERNS.personalBest.layers.flatMap((layer) =>
      layer.kind === "tone" ? [layer] : [],
    );
    const firstOfEachStart = [
      ...new Map(melody.map((layer) => [layer.delay, layer.frequency])),
    ].sort(([a], [b]) => a - b);
    const frequencies = firstOfEachStart.map(([, frequency]) => frequency);
    expect(frequencies).toEqual([...frequencies].sort((a, b) => a - b));
  });

  describe("連続ボーナス", () => {
    const tiers = ["streakUp1", "streakUp2", "streakUp3"] as const;
    const highest = (cue: SoundCue) =>
      Math.max(
        ...SOUND_PATTERNS[cue].layers.flatMap((layer) =>
          layer.kind === "tone" ? [layer.frequency] : [],
        ),
      );

    it("段が上がるほど、いちばん高い音が高くなる", () => {
      expect(highest("streakUp1")).toBeLessThan(highest("streakUp2"));
      expect(highest("streakUp2")).toBeLessThan(highest("streakUp3"));
    });

    it("段が上がるほど、重ねる層が増えて華やかになる", () => {
      expect(SOUND_PATTERNS.streakUp1.layers.length).toBeLessThan(
        SOUND_PATTERNS.streakUp2.layers.length,
      );
      expect(SOUND_PATTERNS.streakUp2.layers.length).toBeLessThan(
        SOUND_PATTERNS.streakUp3.layers.length,
      );
    });

    it.each(tiers)("%s は、音が下から上へ駆け上がる", (cue) => {
      const notes = SOUND_PATTERNS[cue].layers
        .filter((layer) => layer.kind === "tone" && layer.wave === "triangle")
        .map((layer) => (layer.kind === "tone" ? layer.frequency : 0));
      expect(notes.length).toBeGreaterThanOrEqual(2);
      expect(notes).toEqual([...notes].sort((a, b) => a - b));
    });
  });

  describe("同時に起きた場面でも、音量の合計の最大が 1.0 を超えない", () => {
    it("プレイ中: 平らげた瞬間に、連続ボーナス・特別な丼・替え玉・閉店間際が重なり、直前の打鍵とミスの音が残っている", () => {
      const layers = [
        "correct",
        "miss",
        "served",
        "streakUp3",
        "specialBowl",
        "kaedama",
        "closingRush",
      ].flatMap((cue) => layersAt(cue as SoundCue));
      expect(peakVolume(layers)).toBeLessThanOrEqual(1);
    });

    it("始めるとき: 食券を買ってすぐ始め、最初の丼が特別な丼", () => {
      const layers = ["ticket", "opened", "specialBowl"].flatMap((cue) =>
        layersAt(cue as SoundCue),
      );
      expect(peakVolume(layers)).toBeLessThanOrEqual(1);
    });

    it.each([
      0,
      STAMP_LANDING_SECONDS,
    ])("閉店したとき: 平らげた直後の閉店に、判子（%f 秒後）と自己ベスト更新が続く", (stampSeconds) => {
      const layers = [
        ...layersAt("served"),
        ...layersAt("closingRush"),
        ...layersAt("closed"),
        ...layersAt("stamp", stampSeconds),
        ...layersAt(
          "personalBest",
          stampSeconds + PERSONAL_BEST_AFTER_STAMP_SECONDS,
        ),
      ];
      expect(peakVolume(layers)).toBeLessThanOrEqual(1);
    });
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

describe("createSoundPlayer", () => {
  type FakeSource = {
    stopCalls: (number | undefined)[];
    onended: (() => void) | null;
  };
  let sources: FakeSource[];

  // Web Audio は node に無いので、音源の stop の呼ばれ方だけを記録する偽物を置く
  function fakeSource() {
    const source = {
      stopCalls: [] as (number | undefined)[],
      onended: null as (() => void) | null,
      start: () => {},
      stop: (when?: number) => {
        source.stopCalls.push(when);
      },
      connect: (node: unknown) => node,
      frequency: {
        setValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
      },
    };
    sources.push(source);
    return source;
  }
  const param = () => ({ value: 0 });
  class FakeAudioContext {
    state = "running";
    currentTime = 0;
    destination = {};
    sampleRate = 44100;
    createDynamicsCompressor() {
      return {
        threshold: param(),
        knee: param(),
        ratio: param(),
        attack: param(),
        release: param(),
        connect: () => {},
      };
    }
    createBuffer(_channels: number, length: number) {
      return { getChannelData: () => new Float32Array(length) };
    }
    createGain() {
      return {
        gain: {
          setValueAtTime: () => {},
          linearRampToValueAtTime: () => {},
          exponentialRampToValueAtTime: () => {},
        },
        connect: () => {},
      };
    }
    createOscillator() {
      return fakeSource();
    }
    createBufferSource() {
      return fakeSource();
    }
    createBiquadFilter() {
      return {
        frequency: param(),
        Q: param(),
        connect: (node: unknown) => node,
      };
    }
  }

  beforeEach(() => {
    sources = [];
    Object.assign(globalThis, { AudioContext: FakeAudioContext });
  });
  afterEach(() => {
    Reflect.deleteProperty(globalThis, "AudioContext");
  });

  it("stopAll で、遅らせて予約した判子と自己ベストの音を、鳴る前に止める", () => {
    const player = createSoundPlayer();
    player.play("stamp", STAMP_LANDING_SECONDS);
    player.play(
      "personalBest",
      STAMP_LANDING_SECONDS + PERSONAL_BEST_AFTER_STAMP_SECONDS,
    );
    expect(sources.length).toBeGreaterThan(0);
    const scheduledStops = sources.map((source) => source.stopCalls.length);

    player.stopAll();

    // 予約したときの stop に加えて、引数なしの stop（今すぐ止める）が呼ばれる
    sources.forEach((source, index) => {
      expect(source.stopCalls).toHaveLength(scheduledStops[index] + 1);
      expect(source.stopCalls.at(-1)).toBeUndefined();
    });
  });

  it("鳴り終わった音源は、stopAll で止め直さない", () => {
    const player = createSoundPlayer();
    player.play("stamp");
    const finishedStops = sources.map((source) => source.stopCalls.length);
    for (const source of sources) source.onended?.();

    player.stopAll();

    sources.forEach((source, index) => {
      expect(source.stopCalls).toHaveLength(finishedStops[index]);
    });
  });
});
