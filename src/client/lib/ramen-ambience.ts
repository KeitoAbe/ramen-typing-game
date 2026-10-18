import type { RamenGameState } from "@/client/lib/ramen-game";
import {
  type AudioOutput,
  loadOnOffSetting,
  type SoundSettingStorage,
  saveOnOffSetting,
} from "@/client/lib/ramen-sound";

/** 環境音・BGM のオン・オフを保存する localStorage のキー。効果音とは別に切り替える */
export const AMBIENCE_SETTING_STORAGE_KEY = "ramen-game:ambience-enabled";

/** 保存された環境音・BGM の設定を読む。保存されていない・読めないときはオン */
export function loadAmbienceEnabled(
  storage: SoundSettingStorage | undefined,
): boolean {
  return loadOnOffSetting(storage, AMBIENCE_SETTING_STORAGE_KEY);
}

/** 環境音・BGM の設定を保存する */
export function saveAmbienceEnabled(
  storage: SoundSettingStorage | undefined,
  enabled: boolean,
): void {
  saveOnOffSetting(storage, AMBIENCE_SETTING_STORAGE_KEY, enabled);
}

/** 環境音・BGM を流すか。プレイ中で、オンにしていて、ページが見えているときだけ流す */
export function shouldPlayAmbience({
  status,
  enabled,
  visible,
}: {
  status: RamenGameState["status"];
  enabled: boolean;
  visible: boolean;
}): boolean {
  return enabled && visible && status === "playing";
}

/** 流し始めるとき・止めるときに、ぶつ切りにしないよう音量を動かす長さ（秒） */
export const AMBIENCE_FADE_SECONDS = 0.5;

/**
 * 環境音と BGM の、音ごとの最大の音量。効果音（正しく打った音でも 0.03 以上の層を重ねる）より、はっきり小さくする。
 * どの音も、同じ種類の音が 2 つ同時に鳴らないように組むので、これを足したものが全体の最大になる
 */
export const AMBIENCE_VOLUMES = {
  /** 寸胴でスープが煮える低い音（鳴り続ける） */
  simmer: 0.006,
  /** スープの泡がはじける小さな音 */
  bubble: 0.002,
  /** 秋の虫の声 */
  insect: 0.0025,
  /** 遠くのチャルメラ */
  charumera: 0.004,
  /** BGM の旋律 */
  melody: 0.008,
  /** BGM の低音 */
  bass: 0.005,
} as const;

/** 閉店間際に、BGM のテンポと音量を上げて急かす倍率 */
export const CLOSING_RUSH_BGM = { tempoRate: 1.15, gainRate: 1.25 } as const;

/** 環境音と BGM のすべてが同時に最大になったときの音量（最悪の場合） */
export function ambiencePeakVolume(): number {
  const { simmer, bubble, insect, charumera, melody, bass } = AMBIENCE_VOLUMES;
  return (
    simmer +
    bubble +
    insect +
    charumera +
    (melody + bass) * CLOSING_RUSH_BGM.gainRate
  );
}

// ---- BGM ----

/** BGM の 1 拍（8 分音符）の長さ（秒）。ゆったりした速さにする */
export const BGM_BEAT_SECONDS = 0.42;
/** 1 小節の拍の数 */
export const BGM_BEATS_PER_BAR = 8;
/** 1 つの節の小節の数 */
export const BGM_BARS_PER_PHRASE = 4;
/** 同じ主題を、崩しながら繰り返す節の数。これを過ぎたら主題を作り直す */
const BGM_PHRASES_PER_THEME = 4;

/** 陽音階（民謡音階）。レ・ミ・ソ・ラ・シ。レ（D4）からの半音の数 */
const YO_SCALE_SEMITONES = [0, 2, 5, 7, 9] as const;
const BGM_TONIC_HZ = 293.66;

/** 音階の何番目かから周波数を決める。5 つ上がると 1 オクターブ上 */
export function scaleDegreeToFrequency(degree: number): number {
  const octave = Math.floor(degree / YO_SCALE_SEMITONES.length);
  const step = degree - octave * YO_SCALE_SEMITONES.length;
  const semitones = octave * 12 + YO_SCALE_SEMITONES[step];
  return BGM_TONIC_HZ * 2 ** (semitones / 12);
}

/** 1 小節の中の音の長さの並び（拍）。合計は 1 小節の拍の数。null は休み */
const BAR_RHYTHMS: readonly (readonly (number | null)[])[] = [
  [4, 4],
  [2, 2, 4],
  [3, 1, 4],
  [2, 2, 2, 2],
  [6, 2],
  [4, 2, 2],
  [2, 2, 2, null, null],
  [8],
];

/** 節の終わりの小節。主音（レ）で落ち着かせる */
const CADENCE_RHYTHM: readonly (number | null)[] = [2, 2, 4];

/** 小節ごとの低音（音階の何番目か）の流れ。どれも最後は主音に戻る */
const BASS_PROGRESSIONS: readonly (readonly number[])[] = [
  [0, 0, 3, 0],
  [0, 3, 2, 0],
  [0, -2, 3, 0],
  [0, 2, 3, 0],
];

/** 旋律の音域（音階の何番目か）。レ（D4）から 1 オクターブ半 */
const MELODY_MIN_DEGREE = 0;
const MELODY_MAX_DEGREE = 8;

export type BgmNote = {
  voice: "melody" | "bass";
  /** 小節の頭からの拍 */
  beat: number;
  /** 鳴らす長さ（拍） */
  beats: number;
  /** 音階の何番目か */
  degree: number;
};

type ThemeBar = { rhythm: readonly (number | null)[]; degrees: number[] };

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.min(items.length - 1, Math.floor(random() * items.length))];
}

function clampDegree(degree: number): number {
  return Math.max(MELODY_MIN_DEGREE, Math.min(MELODY_MAX_DEGREE, degree));
}

/** 主題を作る。音階の上を、1〜2 段ずつ上り下りする */
function composeTheme(random: () => number): ThemeBar[] {
  let degree = 2 + Math.floor(random() * 4);
  return Array.from({ length: BGM_BARS_PER_PHRASE }, (_, barIndex) => {
    const isLast = barIndex === BGM_BARS_PER_PHRASE - 1;
    const rhythm = isLast ? CADENCE_RHYTHM : pick(BAR_RHYTHMS, random);
    const degrees = rhythm.map((_beats, noteIndex) => {
      if (isLast && noteIndex === rhythm.length - 1) {
        // 節の終わりは、主音（レ）か 1 オクターブ上のレに落ち着かせる
        return degree >= 3 ? 5 : 0;
      }
      degree = clampDegree(degree + pick([-2, -1, -1, 1, 1, 2], random));
      return degree;
    });
    return { rhythm, degrees };
  });
}

/** 主題を少し崩す。音をとなりの段へずらしたり、小節の音の長さを入れ替えたりする */
function varyTheme(theme: ThemeBar[], random: () => number): ThemeBar[] {
  return theme.map((bar, barIndex) => {
    const isLast = barIndex === theme.length - 1;
    if (!isLast && random() < 0.25) {
      // 音の長さを入れ替えて、高さは主題の流れを借りる
      const rhythm = pick(BAR_RHYTHMS, random);
      return {
        rhythm,
        degrees: rhythm.map((_beats, i) =>
          clampDegree(bar.degrees[i % bar.degrees.length] ?? 0),
        ),
      };
    }
    return {
      rhythm: bar.rhythm,
      degrees: bar.degrees.map((degree, i) => {
        // 終わりの音は動かさず、落ち着きを残す
        if (isLast && i === bar.degrees.length - 1) return degree;
        return random() < 0.3
          ? clampDegree(degree + pick([-1, 1], random))
          : degree;
      }),
    };
  });
}

/**
 * BGM を 1 小節ずつ作る。4 小節の主題を、毎回少しずつ崩しながら繰り返し、
 * 何節か繰り返したら主題を作り直す。同じ 4 小節がそのまま何十回も続かないようにする
 */
export function createBgmComposer(random: () => number = Math.random): {
  nextBar: () => BgmNote[];
} {
  let theme = composeTheme(random);
  let phrase = theme;
  let bass = pick(BASS_PROGRESSIONS, random);
  let phraseCount = 0;
  let barIndex = 0;
  return {
    nextBar: () => {
      if (barIndex === BGM_BARS_PER_PHRASE) {
        barIndex = 0;
        phraseCount++;
        if (phraseCount % BGM_PHRASES_PER_THEME === 0) {
          theme = composeTheme(random);
          phrase = theme;
        } else {
          phrase = varyTheme(theme, random);
        }
        bass = pick(BASS_PROGRESSIONS, random);
      }
      const bar = phrase[barIndex];
      const notes: BgmNote[] = [
        {
          voice: "bass",
          beat: 0,
          beats: BGM_BEATS_PER_BAR,
          // 低音は旋律の 1 オクターブ下
          degree: bass[barIndex] - YO_SCALE_SEMITONES.length,
        },
      ];
      let beat = 0;
      bar.rhythm.forEach((beats, i) => {
        if (beats === null) {
          beat += 1;
          return;
        }
        notes.push({ voice: "melody", beat, beats, degree: bar.degrees[i] });
        beat += beats;
      });
      barIndex++;
      return notes;
    },
  };
}

// ---- 環境音 ----

/** 虫が 1 回鳴くまとまり（リーン、リーン…と鳴いて止む） */
export type InsectBurst = {
  /** 鳴き声の高さ（Hz） */
  frequency: number;
  /** 1 声ずつの、まとまりの頭からの時刻と長さ（秒） */
  chirps: readonly { offset: number; duration: number }[];
  /** 鳴き終えてから、次に鳴き出すまでの静かな間（秒） */
  silenceAfter: number;
};

/** 虫の声のまとまりを決める。声の数・長さ・間を毎回変えて、一定の間隔で機械的に繰り返さない */
export function planInsectBurst(
  random: () => number = Math.random,
): InsectBurst {
  const count = 2 + Math.floor(random() * 5);
  const duration = 0.12 + random() * 0.18;
  const chirps: { offset: number; duration: number }[] = [];
  let offset = 0;
  for (let i = 0; i < count; i++) {
    // 声の長さも少しずつ揺らす
    const length = duration * (0.8 + random() * 0.4);
    chirps.push({ offset, duration: length });
    offset += length + 0.08 + random() * 0.2;
  }
  const length = offset;
  return {
    frequency: 3800 + random() * 1000,
    chirps,
    // 鳴いていた長さより長く黙る。ときどき、さらに長く黙り込む
    silenceAfter:
      length + (random() < 0.25 ? 5 + random() * 6 : 0.5 + random() * 3),
  };
}

/** まとまりの頭から、最後の声が鳴り終わるまでの長さ（秒） */
export function insectBurstLength(burst: InsectBurst): number {
  return Math.max(
    ...burst.chirps.map(({ offset, duration }) => offset + duration),
  );
}

/** 虫の声の音量のうち、震わせずに鳴らす分の割合。残りを細かく震わせる */
const INSECT_BODY_RATE = 0.65;

/** 泡がはじける音の長さ（秒） */
const BUBBLE_SECONDS = 0.06;

/** 次の泡を決める。間隔と高さを毎回変える */
export function planBubble(random: () => number = Math.random): {
  frequency: number;
  volumeRate: number;
  /** 次の泡までの間（秒）。泡の長さより長くして、泡どうしを重ねない */
  gapAfter: number;
} {
  return {
    frequency: 180 + random() * 240,
    volumeRate: 0.5 + random() * 0.5,
    gapAfter: BUBBLE_SECONDS + 0.12 + random() * 0.8,
  };
}

/** チャルメラの節「ソラシー ラソ、ソラシラソラー」。拍は 8 分音符 */
export const CHARUMERA_NOTES: readonly {
  beat: number;
  beats: number;
  frequency: number;
}[] = [
  { beat: 0, beats: 1, frequency: 784 },
  { beat: 1, beats: 1, frequency: 880 },
  { beat: 2, beats: 2, frequency: 988 },
  { beat: 4, beats: 1, frequency: 880 },
  { beat: 5, beats: 2, frequency: 784 },
  { beat: 8, beats: 1, frequency: 784 },
  { beat: 9, beats: 1, frequency: 880 },
  { beat: 10, beats: 1, frequency: 988 },
  { beat: 11, beats: 1, frequency: 880 },
  { beat: 12, beats: 1, frequency: 784 },
  { beat: 13, beats: 4, frequency: 880 },
];
/** チャルメラの 1 拍の長さ（秒） */
const CHARUMERA_BEAT_SECONDS = 0.2;
/** チャルメラの節の長さ（秒） */
export const CHARUMERA_SECONDS = 17 * CHARUMERA_BEAT_SECONDS;

/** チャルメラと閉店の間にあける時間（秒）。閉店間際（残り 15 秒）の知らせと重ねない */
const CHARUMERA_END_MARGIN_SECONDS = 16;

/**
 * プレイの何秒目にチャルメラを鳴らすかを決める。1 回か 2 回、毎回違う時刻にする。
 * 閉店間際には鳴らさない
 */
export function planCharumeraTimes(
  playSeconds: number,
  random: () => number = Math.random,
): number[] {
  const latest = playSeconds - CHARUMERA_END_MARGIN_SECONDS - CHARUMERA_SECONDS;
  const first = Math.min(latest, playSeconds * (0.12 + random() * 0.25));
  const times = [Math.max(3, first)];
  const second = playSeconds * (0.5 + random() * 0.25);
  if (random() < 0.6 && second <= latest && second - times[0] >= 10) {
    times.push(second);
  }
  return times;
}

// ---- 再生 ----

/** 予約を足す間隔（ミリ秒）。キー入力の処理を邪魔しないよう、まとめて少しずつ予約する */
const SCHEDULE_INTERVAL_MS = 250;
/** どれだけ先まで予約しておくか（秒）。タイマーが遅れても音が途切れないようにする */
const LOOKAHEAD_SECONDS = 1;
/** 寸胴の音に使う、繰り返すノイズの長さ（秒） */
const SIMMER_BUFFER_SECONDS = 4;

/** 低い音が多い、ゴーッという茶色いノイズ。繰り返しの継ぎ目で音が跳ねないよう、両端の高さをそろえる */
function createBrownNoiseBuffer(context: AudioContext): AudioBuffer {
  const length = Math.floor(context.sampleRate * SIMMER_BUFFER_SECONDS);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  let value = 0;
  for (let i = 0; i < length; i++) {
    value = (value + (Math.random() * 2 - 1) * 0.02) * 0.998;
    data[i] = value;
  }
  // 端から端へまっすぐ引いた分を差し引いて、最初と最後の値を合わせる
  const drift = data[length - 1] - data[0];
  let peak = 0;
  for (let i = 0; i < length; i++) {
    data[i] -= (drift * i) / (length - 1);
    peak = Math.max(peak, Math.abs(data[i]));
  }
  if (peak > 0) for (let i = 0; i < length; i++) data[i] /= peak;
  return buffer;
}

/** 音量をなめらかに目標まで動かす */
function rampTo(
  param: AudioParam,
  target: number,
  now: number,
  seconds: number,
) {
  param.cancelScheduledValues(now);
  param.setValueAtTime(param.value, now);
  param.linearRampToValueAtTime(target, now + seconds);
}

export type AmbiencePlayer = {
  /** プレイを始めた。チャルメラを鳴らす時刻を決め直す */
  startPlay: (playSeconds: number) => void;
  /** 流すかどうか。切り替えるときは AMBIENCE_FADE_SECONDS かけてフェードする */
  setActive: (active: boolean) => void;
  /** 閉店間際かどうか。閉店間際は BGM のテンポと音量を上げる */
  setClosingRush: (isRush: boolean) => void;
  /** フェードを待たずに、すぐすべて止める（画面を離れるとき） */
  stop: () => void;
};

/**
 * 夜の屋台の環境音（寸胴の煮える音・泡・虫の声・遠くのチャルメラ）と、控えめな BGM を流す。
 * 外部の音源は使わず、ブラウザで合成する。
 * 音はタイマーで少し先まで Web Audio の時刻に予約するので、キー入力の処理やゲームの進行を止めない
 */
export function createAmbiencePlayer(
  getOutput: () => AudioOutput,
  random: () => number = Math.random,
): AmbiencePlayer {
  type Graph = {
    context: AudioContext;
    /** 全体の音量。フェードに使う */
    master: GainNode;
    /** BGM の音量。閉店間際に上げる */
    bgm: GainNode;
    /** 環境音の音量 */
    ambience: GainNode;
    simmerBuffer: AudioBuffer;
  };
  let graph: Graph | undefined;
  let isActive = false;
  let isRush = false;
  let scheduleTimer: ReturnType<typeof setInterval> | undefined;
  let stopTimer: ReturnType<typeof setTimeout> | undefined;
  // 乱数を使うので、サーバーでのプリレンダリング中には作らず、最初に流すときに作る
  let composer: ReturnType<typeof createBgmComposer> | undefined;
  let charumeraTimes: number[] = [];
  /**
   * 今のプレイを始めた時刻（Date.now のミリ秒）。チャルメラの時刻を、ゲームの経過時間に合わせる。
   * 環境音を止めている間（タブが裏に回った・オフにした）もゲームは進むので、流した時間では数えない
   */
  let playStartedAt: number | undefined;
  let nextBarTime = 0;
  let nextBubbleTime = 0;
  let nextInsectTime = 0;

  // 止めるために、鳴り終わるまでの音源を持っておく
  const sources = new Set<AudioScheduledSourceNode>();
  const track = (source: AudioScheduledSourceNode) => {
    sources.add(source);
    source.onended = () => sources.delete(source);
  };

  const ensureGraph = (): Graph => {
    if (graph !== undefined) return graph;
    const { context, destination } = getOutput();
    const master = context.createGain();
    master.gain.value = 0;
    master.connect(destination);
    const bgm = context.createGain();
    bgm.connect(master);
    const ambience = context.createGain();
    ambience.connect(master);
    graph = {
      context,
      master,
      bgm,
      ambience,
      simmerBuffer: createBrownNoiseBuffer(context),
    };
    return graph;
  };

  const barSeconds = () =>
    (BGM_BEATS_PER_BAR * BGM_BEAT_SECONDS) /
    (isRush ? CLOSING_RUSH_BGM.tempoRate : 1);

  /** 音量の形を付けた発振器を鳴らす */
  const playTone = (
    g: Graph,
    destination: AudioNode,
    {
      wave,
      frequency,
      begin,
      end,
      attack,
      volume,
    }: {
      wave: OscillatorType;
      frequency: number;
      begin: number;
      end: number;
      attack: number;
      volume: number;
    },
  ): { oscillator: OscillatorNode; gain: GainNode } => {
    const gain = g.context.createGain();
    gain.gain.setValueAtTime(0, begin);
    gain.gain.linearRampToValueAtTime(volume, begin + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    gain.connect(destination);
    const oscillator = g.context.createOscillator();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, begin);
    oscillator.connect(gain);
    oscillator.start(begin);
    oscillator.stop(end);
    track(oscillator);
    return { oscillator, gain };
  };

  const scheduleBar = (g: Graph, start: number) => {
    const beatSeconds = barSeconds() / BGM_BEATS_PER_BAR;
    composer ??= createBgmComposer(random);
    for (const note of composer.nextBar()) {
      const begin = start + note.beat * beatSeconds;
      // 次の音と重ならないよう、少し手前で消す
      const end = begin + note.beats * beatSeconds * 0.95;
      const frequency = scaleDegreeToFrequency(note.degree);
      if (note.voice === "melody") {
        // 琴をはじいたように、すっと立ち上がって消えていく
        playTone(g, g.bgm, {
          wave: "triangle",
          frequency,
          begin,
          end,
          attack: 0.01,
          volume: AMBIENCE_VOLUMES.melody,
        });
      } else {
        playTone(g, g.bgm, {
          wave: "sine",
          frequency,
          begin,
          end,
          attack: 0.4,
          volume: AMBIENCE_VOLUMES.bass,
        });
      }
    }
  };

  const scheduleBubble = (g: Graph, begin: number): number => {
    const bubble = planBubble(random);
    const end = begin + BUBBLE_SECONDS;
    const { oscillator } = playTone(g, g.ambience, {
      wave: "sine",
      frequency: bubble.frequency,
      begin,
      end,
      attack: 0.005,
      volume: AMBIENCE_VOLUMES.bubble * bubble.volumeRate,
    });
    // 泡がはじけるように、音の高さを上げる
    oscillator.frequency.exponentialRampToValueAtTime(
      bubble.frequency * 1.6,
      end,
    );
    return bubble.gapAfter;
  };

  const scheduleInsects = (g: Graph, start: number): number => {
    const burst = planInsectBurst(random);
    for (const chirp of burst.chirps) {
      const begin = start + chirp.offset;
      const end = begin + chirp.duration;
      const { gain } = playTone(g, g.ambience, {
        wave: "sine",
        frequency: burst.frequency,
        begin,
        end,
        attack: 0.02,
        volume: AMBIENCE_VOLUMES.insect * INSECT_BODY_RATE,
      });
      // 羽をすり合わせるように、音量を細かく震わせる。震えの山を足しても AMBIENCE_VOLUMES.insect を超えない
      const trill = g.context.createOscillator();
      trill.frequency.value = 40 + random() * 20;
      const depth = g.context.createGain();
      depth.gain.value = AMBIENCE_VOLUMES.insect * (1 - INSECT_BODY_RATE);
      trill.connect(depth).connect(gain.gain);
      trill.start(begin);
      trill.stop(end);
      track(trill);
    }
    return insectBurstLength(burst) + burst.silenceAfter;
  };

  const scheduleCharumera = (g: Graph, start: number) => {
    // 遠くで鳴っているように、こもらせる
    const filter = g.context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1600;
    filter.connect(g.ambience);
    for (const note of CHARUMERA_NOTES) {
      const begin = start + note.beat * CHARUMERA_BEAT_SECONDS;
      const end = begin + note.beats * CHARUMERA_BEAT_SECONDS * 0.95;
      const { oscillator } = playTone(g, filter, {
        wave: "sawtooth",
        frequency: note.frequency,
        begin,
        end,
        attack: 0.03,
        volume: AMBIENCE_VOLUMES.charumera,
      });
      // 吹いている揺れ（ビブラート）を付ける
      const vibrato = g.context.createOscillator();
      vibrato.frequency.value = 5.5;
      const depth = g.context.createGain();
      depth.gain.value = note.frequency * 0.006;
      vibrato.connect(depth).connect(oscillator.frequency);
      vibrato.start(begin);
      vibrato.stop(end);
      track(vibrato);
    }
  };

  const tick = () => {
    if (graph === undefined) return;
    const g = graph;
    try {
      const now = g.context.currentTime;
      const playedSeconds =
        playStartedAt === undefined ? 0 : (Date.now() - playStartedAt) / 1000;
      // 流せなかった間に過ぎた時刻は鳴らさない（閉店間際にずれ込ませない）
      while (charumeraTimes.length > 0 && charumeraTimes[0] < playedSeconds) {
        charumeraTimes.shift();
      }
      const horizon = now + LOOKAHEAD_SECONDS;
      while (nextBarTime < horizon) {
        scheduleBar(g, nextBarTime);
        nextBarTime += barSeconds();
      }
      while (nextBubbleTime < horizon) {
        nextBubbleTime += scheduleBubble(g, nextBubbleTime);
      }
      while (nextInsectTime < horizon) {
        nextInsectTime += scheduleInsects(g, nextInsectTime);
      }
      while (
        isActive &&
        charumeraTimes.length > 0 &&
        charumeraTimes[0] <= playedSeconds + LOOKAHEAD_SECONDS
      ) {
        const time = charumeraTimes.shift() ?? 0;
        scheduleCharumera(g, now + Math.max(0, time - playedSeconds));
      }
    } catch {
      // 音が出せない環境でもゲームは続けられるので、何もしない
    }
  };

  const startStreams = (g: Graph) => {
    const now = g.context.currentTime;
    nextBarTime = now + 0.1;
    // 泡と虫の声は、流し始めから少しずらして鳴らし始める
    nextBubbleTime = now + 0.3 + random();
    nextInsectTime = now + 1 + random() * 3;
    // 寸胴の煮える音は、繰り返すノイズを低く絞って鳴らし続ける
    const simmer = g.context.createBufferSource();
    simmer.buffer = g.simmerBuffer;
    simmer.loop = true;
    const filter = g.context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 380;
    const gain = g.context.createGain();
    gain.gain.value = AMBIENCE_VOLUMES.simmer;
    simmer.connect(filter).connect(gain).connect(g.ambience);
    simmer.start(now);
    track(simmer);
    scheduleTimer = setInterval(tick, SCHEDULE_INTERVAL_MS);
    tick();
  };

  const stopStreams = () => {
    clearInterval(scheduleTimer);
    scheduleTimer = undefined;
    clearTimeout(stopTimer);
    stopTimer = undefined;
    for (const source of sources) {
      try {
        source.stop();
      } catch {
        // 止められない音源があっても、ほかの音は止める
      }
    }
    sources.clear();
  };

  return {
    startPlay: (playSeconds) => {
      charumeraTimes = planCharumeraTimes(playSeconds, random);
      playStartedAt = Date.now();
    },
    setActive: (active) => {
      if (active === isActive) return;
      isActive = active;
      try {
        if (active) {
          clearTimeout(stopTimer);
          stopTimer = undefined;
          const g = ensureGraph();
          rampTo(
            g.master.gain,
            1,
            g.context.currentTime,
            AMBIENCE_FADE_SECONDS,
          );
          if (scheduleTimer === undefined) startStreams(g);
        } else if (graph !== undefined) {
          rampTo(
            graph.master.gain,
            0,
            graph.context.currentTime,
            AMBIENCE_FADE_SECONDS,
          );
          // 音量が 0 まで下がってから、音源とタイマーを止める
          stopTimer = setTimeout(
            stopStreams,
            AMBIENCE_FADE_SECONDS * 1000 + 50,
          );
        }
      } catch {
        // 音が出せない環境でもゲームは続けられるので、何もしない
      }
    },
    setClosingRush: (rush) => {
      if (rush === isRush) return;
      isRush = rush;
      if (graph === undefined) return;
      try {
        rampTo(
          graph.bgm.gain,
          rush ? CLOSING_RUSH_BGM.gainRate : 1,
          graph.context.currentTime,
          1,
        );
      } catch {
        // 何もしない
      }
    },
    stop: () => {
      isActive = false;
      stopStreams();
      if (graph !== undefined) {
        try {
          graph.master.gain.cancelScheduledValues(graph.context.currentTime);
          graph.master.gain.value = 0;
        } catch {
          // 何もしない
        }
      }
    },
  };
}
