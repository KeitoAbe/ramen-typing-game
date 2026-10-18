import {
  AMBIENCE_FADE_SECONDS,
  AMBIENCE_SETTING_STORAGE_KEY,
  AMBIENCE_VOLUMES,
  ambiencePeakVolume,
  BGM_BARS_PER_PHRASE,
  BGM_BEAT_SECONDS,
  BGM_BEATS_PER_BAR,
  type BgmNote,
  CHARUMERA_NOTES,
  CHARUMERA_SECONDS,
  CLOSING_RUSH_BGM,
  createAmbiencePlayer,
  createBgmComposer,
  insectBurstLength,
  loadAmbienceEnabled,
  planBubble,
  planCharumeraTimes,
  planInsectBurst,
  saveAmbienceEnabled,
  scaleDegreeToFrequency,
  shouldPlayAmbience,
} from "@/client/lib/ramen-ambience";
import { CLOSING_RUSH_THRESHOLD_MS } from "@/client/lib/ramen-closing-rush";
import { COURSES } from "@/client/lib/ramen-course";
import type { PersonalBestStorage } from "@/client/lib/ramen-personal-best";
import {
  type AudioOutput,
  loadSoundEnabled,
  SOUND_PATTERNS,
  SOUND_SETTING_STORAGE_KEY,
  type SoundCue,
} from "@/client/lib/ramen-sound";

/** 決まった順に値を返す乱数。テストの結果を毎回同じにする */
function seededRandom(seed = 1): () => number {
  // mulberry32
  let value = seed;
  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function memoryStorage(): PersonalBestStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

describe("loadAmbienceEnabled / saveAmbienceEnabled", () => {
  it("保存されていなければオン", () => {
    expect(loadAmbienceEnabled(memoryStorage())).toBe(true);
    expect(loadAmbienceEnabled(undefined)).toBe(true);
  });

  it("保存した設定を読み直せる（リロード後も残る）", () => {
    const storage = memoryStorage();
    saveAmbienceEnabled(storage, false);
    expect(loadAmbienceEnabled(storage)).toBe(false);
    saveAmbienceEnabled(storage, true);
    expect(loadAmbienceEnabled(storage)).toBe(true);
  });

  it("効果音とは別のキーに保存し、効果音の設定を変えない", () => {
    const storage = memoryStorage();
    saveAmbienceEnabled(storage, false);
    expect(AMBIENCE_SETTING_STORAGE_KEY).not.toBe(SOUND_SETTING_STORAGE_KEY);
    expect(loadSoundEnabled(storage)).toBe(true);
  });

  it("読み書きできなくても例外を投げない", () => {
    const broken: PersonalBestStorage = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
    };
    expect(loadAmbienceEnabled(broken)).toBe(true);
    expect(() => saveAmbienceEnabled(broken, false)).not.toThrow();
  });
});

describe("shouldPlayAmbience", () => {
  it("プレイ中で、オンで、ページが見えていれば流す", () => {
    expect(
      shouldPlayAmbience({ status: "playing", enabled: true, visible: true }),
    ).toBe(true);
  });

  it.each([
    "ready",
    "closed",
  ] as const)("券売機・トッピング（ready）や結果画面（closed）では流さない: %s", (status) => {
    expect(shouldPlayAmbience({ status, enabled: true, visible: true })).toBe(
      false,
    );
  });

  it("オフにしていれば流さない", () => {
    expect(
      shouldPlayAmbience({ status: "playing", enabled: false, visible: true }),
    ).toBe(false);
  });

  it("タブが裏に回ってページが見えなければ止める", () => {
    expect(
      shouldPlayAmbience({ status: "playing", enabled: true, visible: false }),
    ).toBe(false);
  });
});

/** 層の音量の合計。すべての層が同時に最大になったときの大きさ（最悪の場合）とみなす */
function totalVolume(cue: SoundCue): number {
  return SOUND_PATTERNS[cue].layers.reduce(
    (sum, layer) => sum + layer.volume,
    0,
  );
}

describe("音量", () => {
  it("環境音と BGM がすべて同時に最大になっても、いちばん小さい効果音（正しく打った音）の 6 割より小さい", () => {
    const quietest = Math.min(
      ...(Object.keys(SOUND_PATTERNS) as SoundCue[])
        .filter((cue) => SOUND_PATTERNS[cue].layers.length > 0)
        .map(totalVolume),
    );
    expect(quietest).toBe(totalVolume("correct"));
    expect(ambiencePeakVolume()).toBeLessThan(quietest * 0.6);
  });

  // 効果音のテスト（ramen-sound.test.ts）と同じく、重なって鳴る層の音量の合計の最大値で比べる
  function peakVolume(cues: readonly SoundCue[]): number {
    const layers = cues.flatMap((cue) => SOUND_PATTERNS[cue].layers);
    return Math.max(
      ...layers.map(({ delay: time }) =>
        layers
          .filter(
            (layer) =>
              layer.delay <= time && time < layer.delay + layer.duration,
          )
          .reduce((sum, layer) => sum + layer.volume, 0),
      ),
    );
  }

  it.each<[string, SoundCue[]]>([
    [
      "平らげた瞬間に、連続ボーナス・特別な丼・替え玉・閉店間際が重なり、直前の打鍵とミスの音が残っている",
      [
        "correct",
        "miss",
        "served",
        "streakUp3",
        "specialBowl",
        "kaedama",
        "closingRush",
      ],
    ],
    ["プレイを始めて、最初の丼が特別な丼", ["ticket", "opened", "specialBowl"]],
    [
      "平らげた直後に閉店する（フェードの途中）",
      ["served", "closingRush", "closed"],
    ],
  ])("%s: 環境音と BGM が最大でも、合計が 1.0 を超えない", (_name, cues) => {
    expect(peakVolume(cues) + ambiencePeakVolume()).toBeLessThanOrEqual(1);
  });

  it("閉店間際は、BGM の音量とテンポを上げる", () => {
    expect(CLOSING_RUSH_BGM.gainRate).toBeGreaterThan(1);
    expect(CLOSING_RUSH_BGM.tempoRate).toBeGreaterThan(1);
  });

  it("どの音も、音量が 0 より大きい", () => {
    for (const volume of Object.values(AMBIENCE_VOLUMES)) {
      expect(volume).toBeGreaterThan(0);
    }
  });
});

/** 1 節（4 小節）ぶんの旋律を、比べられる文字列にする */
function phraseKey(bars: BgmNote[][]): string {
  return JSON.stringify(
    bars.map((notes) => notes.filter((note) => note.voice === "melody")),
  );
}

describe("createBgmComposer", () => {
  const composer = createBgmComposer(seededRandom(7));
  const bars = Array.from({ length: 64 }, () => composer.nextBar());
  const phrases = Array.from(
    { length: bars.length / BGM_BARS_PER_PHRASE },
    (_, i) =>
      bars.slice(i * BGM_BARS_PER_PHRASE, (i + 1) * BGM_BARS_PER_PHRASE),
  );

  it("どの小節も、低音を 1 つと、旋律を 1 つ以上鳴らす", () => {
    for (const notes of bars) {
      expect(notes.filter((note) => note.voice === "bass")).toHaveLength(1);
      expect(
        notes.filter((note) => note.voice === "melody").length,
      ).toBeGreaterThan(0);
    }
  });

  it("旋律の音は重ならず、小節からはみ出さない", () => {
    for (const notes of bars) {
      const melody = notes.filter((note) => note.voice === "melody");
      melody.forEach((note, i) => {
        const next = melody[i + 1];
        expect(note.beat + note.beats).toBeLessThanOrEqual(
          next?.beat ?? BGM_BEATS_PER_BAR,
        );
      });
    }
  });

  it("和風の音階（陽音階: レ・ミ・ソ・ラ・シ）の音だけを使う", () => {
    const pitchClasses = new Set(
      bars.flat().map((note) => {
        const semitones = Math.round(
          12 * Math.log2(scaleDegreeToFrequency(note.degree) / 293.66),
        );
        return ((semitones % 12) + 12) % 12;
      }),
    );
    for (const pitchClass of pitchClasses) {
      expect([0, 2, 5, 7, 9]).toContain(pitchClass);
    }
  });

  it("節の終わりは、主音（レ）に落ち着く", () => {
    for (const phrase of phrases) {
      const melody = phrase
        .at(-1)
        ?.filter((note) => note.voice === "melody")
        .at(-1);
      expect([0, 5]).toContain(melody?.degree);
    }
  });

  it("同じ 4 小節がそのまま繰り返されず、16 節のうちほとんどが違う節になる", () => {
    const keys = phrases.map(phraseKey);
    expect(new Set(keys).size).toBeGreaterThanOrEqual(keys.length - 2);
    keys.slice(1).forEach((key, i) => {
      expect(key).not.toBe(keys[i]);
    });
  });

  it("崩しながらも主題を繰り返すので、続く節どうしは旋律の音の多くを共有する（ゆるい繰り返し）", () => {
    const degreesOf = (phrase: BgmNote[][]) =>
      phrase
        .flat()
        .filter((note) => note.voice === "melody")
        .map((note) => note.degree);
    const first = degreesOf(phrases[0]);
    const second = degreesOf(phrases[1]);
    const shared = second.filter((degree, i) => first[i] === degree).length;
    expect(shared / second.length).toBeGreaterThan(0.3);
  });
});

describe("planInsectBurst", () => {
  const random = seededRandom(3);
  const bursts = Array.from({ length: 30 }, () => planInsectBurst(random));

  it("1 回のまとまりで、声どうしは重ならない", () => {
    for (const burst of bursts) {
      burst.chirps.forEach((chirp, i) => {
        const next = burst.chirps[i + 1];
        if (next) {
          expect(chirp.offset + chirp.duration).toBeLessThan(next.offset);
        }
      });
    }
  });

  it("鳴いて止む: 鳴き終えたあと、鳴いていた長さより長く黙る", () => {
    for (const burst of bursts) {
      expect(burst.silenceAfter).toBeGreaterThan(insectBurstLength(burst));
    }
  });

  it("一定の間隔で機械的に繰り返さない（鳴き出す間隔と、声の数がまちまち）", () => {
    const intervals = bursts.map(
      (burst) => insectBurstLength(burst) + burst.silenceAfter,
    );
    expect(new Set(intervals.map((s) => s.toFixed(2))).size).toBeGreaterThan(
      20,
    );
    expect(
      new Set(bursts.map((burst) => burst.chirps.length)).size,
    ).toBeGreaterThan(2);
  });
});

describe("planBubble", () => {
  it("泡どうしを重ねず、間隔がまちまち", () => {
    const random = seededRandom(5);
    const gaps = Array.from({ length: 20 }, () => planBubble(random).gapAfter);
    for (const gap of gaps) expect(gap).toBeGreaterThan(0.06);
    expect(new Set(gaps.map((g) => g.toFixed(2))).size).toBeGreaterThan(10);
  });
});

describe("planCharumeraTimes", () => {
  it.each(
    COURSES.map((course) => [course.name, course.timeLimitMs / 1000] as const),
  )("%s のコースでは、1〜2 回、閉店間際より前に鳴り終わる", (_name, playSeconds) => {
    for (let seed = 1; seed <= 50; seed++) {
      const times = planCharumeraTimes(playSeconds, seededRandom(seed));
      expect(times.length).toBeGreaterThanOrEqual(1);
      expect(times.length).toBeLessThanOrEqual(2);
      for (const time of times) {
        expect(time).toBeGreaterThan(0);
        expect(time + CHARUMERA_SECONDS).toBeLessThanOrEqual(
          playSeconds - CLOSING_RUSH_THRESHOLD_MS / 1000,
        );
      }
      if (times.length === 2) {
        expect(times[1] - times[0]).toBeGreaterThanOrEqual(10);
      }
    }
  });

  it("プレイごとに、鳴らす時刻と回数が変わる（不規則なタイミング）", () => {
    const plans = Array.from({ length: 30 }, (_, i) =>
      planCharumeraTimes(90, seededRandom(i + 1)),
    );
    expect(
      new Set(plans.map((times) => times[0].toFixed(1))).size,
    ).toBeGreaterThan(10);
    expect(new Set(plans.map((times) => times.length)).size).toBe(2);
  });

  it("節は、チャルメラの「ソラシー ラソ、ソラシラソラー」の音の並び", () => {
    expect(CHARUMERA_NOTES.map((note) => note.frequency)).toEqual([
      784, 880, 988, 880, 784, 784, 880, 988, 880, 784, 880,
    ]);
  });
});

describe("createAmbiencePlayer", () => {
  type FakeParam = {
    value: number;
    ramps: { target: number; time: number }[];
    setValueAtTime: (value: number, time: number) => void;
    linearRampToValueAtTime: (value: number, time: number) => void;
    exponentialRampToValueAtTime: (value: number, time: number) => void;
    cancelScheduledValues: () => void;
  };
  type FakeSource = {
    started: number[];
    stopCalls: (number | undefined)[];
    onended: (() => void) | null;
    loop: boolean;
    type: string;
  };

  let context: FakeAudioContext;
  let sources: FakeSource[];
  let gains: { gain: FakeParam }[];

  function param(): FakeParam {
    const p: FakeParam = {
      value: 0,
      ramps: [],
      setValueAtTime: (value) => {
        p.value = value;
      },
      linearRampToValueAtTime: (target, time) => {
        p.ramps.push({ target, time });
      },
      exponentialRampToValueAtTime: () => {},
      cancelScheduledValues: () => {},
    };
    return p;
  }
  const node = () => ({ connect: (next: unknown) => next });
  function fakeSource() {
    const source = {
      ...node(),
      started: [] as number[],
      stopCalls: [] as (number | undefined)[],
      onended: null as (() => void) | null,
      start: (when = 0) => {
        source.started.push(when);
      },
      stop: (when?: number) => {
        source.stopCalls.push(when);
      },
      frequency: param(),
      buffer: null as unknown,
      loop: false,
      type: "",
    };
    sources.push(source);
    return source;
  }
  class FakeAudioContext {
    state = "running";
    currentTime = 0;
    sampleRate = 8000;
    createBuffer(_channels: number, length: number) {
      return { getChannelData: () => new Float32Array(length) };
    }
    createGain() {
      const gain = { ...node(), gain: param() };
      gains.push(gain);
      return gain;
    }
    createOscillator() {
      return fakeSource();
    }
    createBufferSource() {
      return fakeSource();
    }
    createBiquadFilter() {
      return { ...node(), type: "", frequency: param(), Q: param() };
    }
  }

  function createPlayer() {
    const output = {
      context,
      destination: node(),
    } as unknown as AudioOutput;
    return createAmbiencePlayer(() => output, seededRandom(11));
  }
  const master = () => gains[0].gain;
  const playing = () =>
    sources.filter((source) => source.stopCalls.at(-1) !== undefined);

  beforeEach(() => {
    jest.useFakeTimers();
    context = new FakeAudioContext();
    sources = [];
    gains = [];
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("流し始めるまで、AudioContext の音を何も作らない", () => {
    const player = createPlayer();
    player.startPlay(90);
    expect(sources).toHaveLength(0);
  });

  it("流し始めると、全体の音量を 0 からフェードで上げ、寸胴の音を鳴らし続ける", () => {
    const player = createPlayer();
    player.startPlay(90);
    player.setActive(true);
    expect(master().ramps.at(-1)).toEqual({
      target: 1,
      time: AMBIENCE_FADE_SECONDS,
    });
    expect(sources.some((source) => source.loop)).toBe(true);
    // BGM の最初の小節も予約している
    expect(sources.length).toBeGreaterThan(1);
  });

  it("時間が進むと、少し先までの音を予約し足していく", () => {
    const player = createPlayer();
    player.setActive(true);
    const before = sources.length;
    context.currentTime = 10;
    jest.advanceTimersByTime(300);
    expect(sources.length).toBeGreaterThan(before);
    // 予約は 1 小節ずつなので、小節の頭から 1 小節ぶん先までに収まる
    const latestStart = Math.max(...sources.flatMap((s) => s.started));
    expect(latestStart).toBeGreaterThanOrEqual(10);
    expect(latestStart).toBeLessThanOrEqual(
      10 + 1 + BGM_BEATS_PER_BAR * BGM_BEAT_SECONDS,
    );
  });

  it("止めるときは、音量をフェードで 0 に下げてから、すべての音源を止める", () => {
    const player = createPlayer();
    player.setActive(true);
    player.setActive(false);
    expect(master().ramps.at(-1)).toEqual({
      target: 0,
      time: AMBIENCE_FADE_SECONDS,
    });
    // フェードの間は鳴らしたまま
    expect(sources.every((source) => source.stopCalls.length <= 1)).toBe(true);
    jest.advanceTimersByTime(AMBIENCE_FADE_SECONDS * 1000 + 100);
    for (const source of sources) {
      if (source.onended === null) continue;
      expect(source.stopCalls.at(-1)).toBeUndefined();
    }
    // 止めたあとは予約を足さない
    const count = sources.length;
    context.currentTime = 20;
    jest.advanceTimersByTime(1000);
    expect(sources).toHaveLength(count);
  });

  it("フェードの途中で流し直したら、止めずに続け、寸胴の音を二重に鳴らさない", () => {
    const player = createPlayer();
    player.setActive(true);
    player.setActive(false);
    player.setActive(true);
    jest.advanceTimersByTime(AMBIENCE_FADE_SECONDS * 1000 + 100);
    expect(sources.filter((source) => source.loop)).toHaveLength(1);
    expect(playing().length).toBeGreaterThan(0);
  });

  it("閉店間際になると BGM の音量を上げ、終わると戻す", () => {
    const player = createPlayer();
    player.setActive(true);
    const bgm = gains[1].gain;
    player.setClosingRush(true);
    expect(bgm.ramps.at(-1)?.target).toBe(CLOSING_RUSH_BGM.gainRate);
    player.setClosingRush(false);
    expect(bgm.ramps.at(-1)?.target).toBe(1);
  });

  /** 音の時刻とタイマー（Date.now）を、そろえて少しずつ進める */
  function advance(seconds: number) {
    for (let elapsed = 0; elapsed < seconds; elapsed += 0.25) {
      context.currentTime += 0.25;
      jest.advanceTimersByTime(250);
    }
  }
  const charumeraStarts = () =>
    sources
      .filter((source) => source.type === "sawtooth")
      .flatMap((source) => source.started);

  it("チャルメラを、閉店間際より前のプレイ中に鳴らす", () => {
    const player = createPlayer();
    player.startPlay(60);
    player.setActive(true);
    advance(60);
    const starts = charumeraStarts();
    expect(starts.length).toBeGreaterThan(0);
    expect(Math.max(...starts)).toBeLessThan(60 - 15);
  });

  it("環境音を止めている間に過ぎたチャルメラの時刻は、流し直しても鳴らさない", () => {
    const player = createPlayer();
    player.startPlay(60);
    // オフのままゲームだけが 45 秒進む（チャルメラの時刻はすべて過ぎている）
    jest.advanceTimersByTime(45_000);
    context.currentTime = 45;
    player.setActive(true);
    advance(15);
    expect(charumeraStarts()).toHaveLength(0);
  });

  it("stop で、フェードを待たずにすぐ止める", () => {
    const player = createPlayer();
    player.setActive(true);
    player.stop();
    for (const source of sources) {
      expect(source.stopCalls.at(-1)).toBeUndefined();
    }
    expect(master().value).toBe(0);
  });

  it("AudioContext が使えない環境でも、例外を投げない", () => {
    const player = createAmbiencePlayer(() => {
      throw new Error("no audio");
    });
    expect(() => {
      player.startPlay(60);
      player.setActive(true);
      player.setClosingRush(true);
      player.setActive(false);
      player.stop();
    }).not.toThrow();
  });
});
