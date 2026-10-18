import type { RamenGameEvent } from "@/client/lib/ramen-events";
import type { PersonalBestStorage } from "@/client/lib/ramen-personal-best";
import { RESULT_REVEAL } from "@/client/lib/ramen-result-reveal";

/** 音のオン・オフを保存する localStorage のキー */
export const SOUND_SETTING_STORAGE_KEY = "ramen-game:sound-enabled";

/** 保存先。テストで差し替えられるよう、使うメソッドだけに絞る */
export type SoundSettingStorage = PersonalBestStorage;

/** 保存されたオン・オフの設定を読む。保存されていない・読めないときはオン */
export function loadOnOffSetting(
  storage: SoundSettingStorage | undefined,
  key: string,
): boolean {
  try {
    return storage?.getItem(key) !== "off";
  } catch {
    return true;
  }
}

/** オン・オフの設定を保存する。保存できなくてもゲームは続けられるので、例外は投げない */
export function saveOnOffSetting(
  storage: SoundSettingStorage | undefined,
  key: string,
  enabled: boolean,
): void {
  try {
    storage?.setItem(key, enabled ? "on" : "off");
  } catch {
    // 何もしない
  }
}

/** 保存された効果音の設定を読む。保存されていない・読めないときはオン */
export function loadSoundEnabled(
  storage: SoundSettingStorage | undefined,
): boolean {
  return loadOnOffSetting(storage, SOUND_SETTING_STORAGE_KEY);
}

/** 効果音の設定を保存する */
export function saveSoundEnabled(
  storage: SoundSettingStorage | undefined,
  enabled: boolean,
): void {
  saveOnOffSetting(storage, SOUND_SETTING_STORAGE_KEY, enabled);
}

/** 効果音を組み立てる層に共通する、時間と音量 */
type LayerEnvelope = {
  /** 鳴らし始めるまでの遅れ（秒） */
  delay: number;
  /** 鳴らし始めてから消えるまでの長さ（秒） */
  duration: number;
  /** 最大の音量に届くまでの時間（秒）。短いほど打った感じが強くなる */
  attack: number;
  /** 最大の音量（0〜1） */
  volume: number;
};

/** 発振器の層。音の高さ（胴鳴りや鐘の響き）を作る */
type ToneLayer = LayerEnvelope & {
  kind: "tone";
  wave: OscillatorType;
  /** 鳴り始めの周波数（Hz） */
  frequency: number;
  /** 鳴り終わりの周波数（Hz）。木を叩いた音のように、高さが落ちていく音に使う */
  endFrequency?: number;
};

/** ノイズの層。帯域を絞ったノイズで、木や打楽器を叩いたときのカツッという質感を作る */
type NoiseLayer = LayerEnvelope & {
  kind: "noise";
  /** ノイズを通すフィルタの中心の周波数（Hz）。高いほど硬く乾いた音になる */
  filterFrequency: number;
  /** フィルタの鋭さ。大きいほど音程感のある響きになる */
  q: number;
};

type SoundLayer = ToneLayer | NoiseLayer;

type SoundPattern = {
  layers: readonly SoundLayer[];
  /** 鳴らすたびに高さを揺らす幅（0.05 なら ±5%）。連打しても機械的に聞こえないようにする */
  pitchVariation: number;
};

/** ゲームの出来事のほかに、画面の操作や結果画面の演出で鳴らす音 */
export type SoundCue =
  | RamenGameEvent
  /** 券売機で食券を買った */
  | "ticket"
  /** 結果画面で称号の判子が押された */
  | "stamp"
  /** 結果画面で自己ベストを更新した */
  | "personalBest";

/**
 * 結果画面が出てから、称号の判子が伝票に着くまでの時間（秒）。
 * 結果発表の演出の段取り（差し引きが出たあとに判子を押す）に合わせる
 */
export const STAMP_LANDING_SECONDS = RESULT_REVEAL.stampLanding;

/** 判子の音から、自己ベスト更新のファンファーレを鳴らし始めるまでの間（秒）。判子の音と重ならないようにする */
export const PERSONAL_BEST_AFTER_STAMP_SECONDS = 0.25;

type HyoshigiOptions = {
  /** 木の胴が響き続ける長さ（秒） */
  ring?: number;
  /** 音量の倍率 */
  gain?: number;
};

/** 拍子木を 1 回打った音。乾いたカツッ（ノイズ）に、木の胴の高い響き（発振器 2 つ）を重ねる */
function hyoshigiStrike(
  delay: number,
  { ring = 0.5, gain = 1 }: HyoshigiOptions = {},
): readonly SoundLayer[] {
  return [
    {
      kind: "noise",
      filterFrequency: 2400,
      q: 6,
      delay,
      duration: 0.06,
      attack: 0.001,
      volume: 0.07 * gain,
    },
    {
      kind: "tone",
      wave: "sine",
      frequency: 1760,
      endFrequency: 1720,
      delay,
      duration: ring,
      attack: 0.002,
      volume: 0.06 * gain,
    },
    {
      // 木の響きらしさを出すため、倍音から外れた高さを薄く重ねる
      kind: "tone",
      wave: "sine",
      frequency: 4580,
      delay,
      duration: Math.min(0.12, ring),
      attack: 0.001,
      volume: 0.02 * gain,
    },
  ];
}

/** 鈴を 1 回振った音。打った瞬間の硬いノイズに、倍音から外れた高い響きを重ねて、金属らしくキラッと鳴らす */
function bellStrike(
  delay: number,
  frequency: number,
  ring: number,
): readonly SoundLayer[] {
  return [
    {
      kind: "noise",
      filterFrequency: 6000,
      q: 5,
      delay,
      duration: 0.03,
      attack: 0.001,
      volume: 0.02,
    },
    {
      kind: "tone",
      wave: "sine",
      frequency,
      delay,
      duration: ring,
      attack: 0.002,
      volume: 0.035,
    },
    {
      kind: "tone",
      wave: "sine",
      frequency: frequency * 2.76,
      delay,
      duration: ring * 0.5,
      attack: 0.001,
      volume: 0.012,
    },
  ];
}

/** 連続ボーナスの段ごとに、駆け上がる音の高さ（Hz）。段が上がるほど高く、音の数も増える */
const STREAK_UP_NOTES = [
  [784, 1047],
  [880, 1175, 1480],
  [1047, 1319, 1568, 2093],
] as const;

/**
 * 連続ボーナスの倍率が上がった音。拍子木のような短いカツッに続けて、音を駆け上がる。
 * いちばん上の段では、最後に鈴の響きを足して華やかにする
 */
function streakUp(tier: 0 | 1 | 2): SoundPattern {
  const notes = STREAK_UP_NOTES[tier];
  const step = 0.06;
  const layers: SoundLayer[] = [
    {
      kind: "noise",
      filterFrequency: 3000,
      q: 4,
      delay: 0,
      duration: 0.03,
      attack: 0.001,
      volume: 0.02,
    },
    ...notes.map(
      (frequency, index): SoundLayer => ({
        kind: "tone",
        wave: "triangle",
        frequency,
        delay: step * index,
        // 最後の音だけ少し伸ばして、上がりきった感じを出す
        duration: index === notes.length - 1 ? 0.22 : 0.12,
        attack: 0.004,
        volume: 0.04,
      }),
    ),
  ];
  if (tier === 2) {
    layers.push({
      kind: "tone",
      wave: "sine",
      frequency: 4186,
      delay: step * (notes.length - 1),
      duration: 0.25,
      attack: 0.002,
      volume: 0.012,
    });
  }
  return { pitchVariation: 0, layers };
}

/**
 * 出来事ごとの効果音。外部の音源は使わず、ブラウザで合成する。
 * 丼を下げられたときは、のびていることが画面の動きで分かるので鳴らさない
 */
export const SOUND_PATTERNS: Readonly<Record<SoundCue, SoundPattern>> = {
  // 木のカウンターを指先で叩くコッ。帯域を絞った短いノイズに、高さが落ちる胴鳴りを重ねる
  correct: {
    pitchVariation: 0.06,
    layers: [
      {
        kind: "noise",
        filterFrequency: 1800,
        q: 3,
        delay: 0,
        duration: 0.03,
        attack: 0.001,
        volume: 0.035,
      },
      {
        kind: "tone",
        wave: "sine",
        frequency: 900,
        endFrequency: 600,
        delay: 0,
        duration: 0.045,
        attack: 0.002,
        volume: 0.03,
      },
    ],
  },
  // 鈍く詰まった木の音ゴッ。低く落ちる胴鳴りに、こもったノイズを重ねる
  miss: {
    pitchVariation: 0,
    layers: [
      {
        kind: "tone",
        wave: "sine",
        frequency: 180,
        endFrequency: 110,
        delay: 0,
        duration: 0.12,
        attack: 0.003,
        volume: 0.08,
      },
      {
        kind: "noise",
        filterFrequency: 420,
        q: 1.2,
        delay: 0,
        duration: 0.07,
        attack: 0.002,
        volume: 0.05,
      },
    ],
  },
  // 空の丼を置くコトン（低いノイズと落ちる胴鳴り）に、明るく上がる 3 音を重ねる
  served: {
    pitchVariation: 0,
    layers: [
      {
        kind: "noise",
        filterFrequency: 320,
        q: 1.5,
        delay: 0,
        duration: 0.08,
        attack: 0.002,
        volume: 0.06,
      },
      {
        kind: "tone",
        wave: "sine",
        frequency: 240,
        endFrequency: 170,
        delay: 0,
        duration: 0.1,
        attack: 0.002,
        volume: 0.06,
      },
      {
        kind: "tone",
        wave: "triangle",
        frequency: 784,
        delay: 0.08,
        duration: 0.12,
        attack: 0.005,
        volume: 0.05,
      },
      {
        kind: "tone",
        wave: "triangle",
        frequency: 1047,
        delay: 0.16,
        duration: 0.12,
        attack: 0.005,
        volume: 0.05,
      },
      {
        kind: "tone",
        wave: "triangle",
        frequency: 1319,
        delay: 0.24,
        duration: 0.15,
        attack: 0.005,
        volume: 0.04,
      },
    ],
  },
  discarded: { pitchVariation: 0, layers: [] },
  // ハッとする鐘。打った瞬間の硬いノイズに、倍音から外れた高さを重ねて鐘らしく響かせる
  kaedama: {
    pitchVariation: 0,
    layers: [
      {
        kind: "noise",
        filterFrequency: 3000,
        q: 4,
        delay: 0,
        duration: 0.04,
        attack: 0.001,
        volume: 0.05,
      },
      {
        kind: "tone",
        wave: "sine",
        frequency: 1200,
        delay: 0,
        duration: 0.48,
        attack: 0.002,
        volume: 0.06,
      },
      {
        kind: "tone",
        wave: "sine",
        frequency: 3240,
        delay: 0,
        duration: 0.25,
        attack: 0.002,
        volume: 0.025,
      },
      {
        kind: "tone",
        wave: "sine",
        frequency: 1810,
        delay: 0,
        duration: 0.35,
        attack: 0.002,
        volume: 0.025,
      },
    ],
  },
  // 店じまいの拍子木「カン、カン」
  closed: {
    pitchVariation: 0,
    layers: [...hyoshigiStrike(0), ...hyoshigiStrike(0.45)],
  },
  // 券売機のボタンのカチッ（高く短いノイズと発振器）に続けて、券が出てくるガシャン
  // （広い帯域のノイズに、金属の受け口の響きと、券が落ちる鈍い音を重ねる）
  ticket: {
    pitchVariation: 0,
    layers: [
      {
        kind: "noise",
        filterFrequency: 4000,
        q: 3,
        delay: 0,
        duration: 0.025,
        attack: 0.001,
        volume: 0.04,
      },
      {
        kind: "tone",
        wave: "sine",
        frequency: 2200,
        endFrequency: 1800,
        delay: 0,
        duration: 0.03,
        attack: 0.001,
        volume: 0.03,
      },
      {
        kind: "noise",
        filterFrequency: 1200,
        q: 0.8,
        delay: 0.15,
        duration: 0.25,
        attack: 0.002,
        volume: 0.06,
      },
      {
        kind: "tone",
        wave: "sine",
        frequency: 620,
        delay: 0.15,
        duration: 0.3,
        attack: 0.002,
        volume: 0.03,
      },
      {
        kind: "tone",
        wave: "sine",
        frequency: 1470,
        delay: 0.15,
        duration: 0.2,
        attack: 0.002,
        volume: 0.02,
      },
      {
        kind: "tone",
        wave: "sine",
        frequency: 150,
        endFrequency: 90,
        delay: 0.15,
        duration: 0.12,
        attack: 0.002,
        volume: 0.05,
      },
    ],
  },
  // 「いただきます」の拍子木を 1 回「カン」。閉店の音より響きを短くして、始まりの合図らしく歯切れよくする
  opened: {
    pitchVariation: 0,
    layers: hyoshigiStrike(0, { ring: 0.35 }),
  },
  // 店主のおすすめが出たときの、鈴のキラッ。高さの違う鈴を 2 回振る
  specialBowl: {
    pitchVariation: 0,
    layers: [...bellStrike(0, 2637, 0.35), ...bellStrike(0.08, 3136, 0.4)],
  },
  streakUp1: streakUp(0),
  streakUp2: streakUp(1),
  streakUp3: streakUp(2),
  // 閉店間際を知らせる、拍子木の速い連打「カカカカン」。響きを短く切って急かす感じを出し、最後の 1 打だけ響かせる
  closingRush: {
    pitchVariation: 0,
    layers: [
      ...hyoshigiStrike(0, { ring: 0.12, gain: 0.7 }),
      ...hyoshigiStrike(0.11, { ring: 0.12, gain: 0.7 }),
      ...hyoshigiStrike(0.22, { ring: 0.12, gain: 0.7 }),
      ...hyoshigiStrike(0.33, { ring: 0.35, gain: 0.7 }),
    ],
  },
  // 判子を押すトン。低く落ちる胴鳴りに、こもったノイズと、紙を打つ乾いたノイズを重ねる
  stamp: {
    pitchVariation: 0,
    layers: [
      {
        kind: "tone",
        wave: "sine",
        frequency: 140,
        endFrequency: 70,
        delay: 0,
        duration: 0.16,
        attack: 0.002,
        volume: 0.1,
      },
      {
        kind: "noise",
        filterFrequency: 500,
        q: 1,
        delay: 0,
        duration: 0.06,
        attack: 0.001,
        volume: 0.06,
      },
      {
        kind: "noise",
        filterFrequency: 1800,
        q: 0.7,
        delay: 0,
        duration: 0.03,
        attack: 0.001,
        volume: 0.02,
      },
    ],
  },
  // 自己ベスト更新のファンファーレ。ド・ミ・ソと駆け上がり、高いドの和音を伸ばして、鈴の響きを添える
  personalBest: {
    pitchVariation: 0,
    layers: [
      ...[523, 659, 784].map(
        (frequency, index): SoundLayer => ({
          kind: "tone",
          wave: "triangle",
          frequency,
          delay: 0.1 * index,
          duration: 0.12,
          attack: 0.005,
          volume: 0.05,
        }),
      ),
      {
        kind: "tone",
        wave: "triangle",
        frequency: 1047,
        delay: 0.3,
        duration: 0.6,
        attack: 0.01,
        volume: 0.05,
      },
      {
        kind: "tone",
        wave: "triangle",
        frequency: 1319,
        delay: 0.3,
        duration: 0.5,
        attack: 0.01,
        volume: 0.03,
      },
      {
        kind: "tone",
        wave: "triangle",
        frequency: 784,
        delay: 0.3,
        duration: 0.5,
        attack: 0.01,
        volume: 0.03,
      },
      {
        kind: "noise",
        filterFrequency: 6000,
        q: 3,
        delay: 0.3,
        duration: 0.05,
        attack: 0.001,
        volume: 0.015,
      },
    ],
  },
};

/**
 * 鳴らす層を決める。pitchVariation があれば、高さ（発振器の周波数とノイズのフィルタ）を
 * 同じ割合で揺らす。random は 0 以上 1 未満を返す関数で、テストで差し替えられる
 */
export function resolveSoundLayers(
  cue: SoundCue,
  random: () => number = Math.random,
): readonly SoundLayer[] {
  const { layers, pitchVariation } = SOUND_PATTERNS[cue];
  if (pitchVariation === 0) return layers;
  const ratio = 1 + (random() * 2 - 1) * pitchVariation;
  return layers.map((layer) =>
    layer.kind === "tone"
      ? {
          ...layer,
          frequency: layer.frequency * ratio,
          endFrequency:
            layer.endFrequency === undefined
              ? undefined
              : layer.endFrequency * ratio,
        }
      : { ...layer, filterFrequency: layer.filterFrequency * ratio },
  );
}

/** ノイズの層で使う白色ノイズの長さ（秒）。毎回作らず、1 つを使い回す */
const NOISE_BUFFER_SECONDS = 1;

function createNoiseBuffer(context: AudioContext): AudioBuffer {
  const length = Math.floor(context.sampleRate * NOISE_BUFFER_SECONDS);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/** 層の音量の形。立ち上がってから、指数的に減衰させて消す */
function applyEnvelope(
  gain: GainNode,
  layer: SoundLayer,
  begin: number,
  end: number,
): void {
  gain.gain.setValueAtTime(0, begin);
  gain.gain.linearRampToValueAtTime(layer.volume, begin + layer.attack);
  // 鳴り終わりのプツッという音を避けるため、音量を絞ってから止める
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
}

/** 音を鳴らす AudioContext と、すべての音を最後に通す出口 */
export type AudioOutput = {
  context: AudioContext;
  destination: AudioNode;
};

/**
 * 効果音と環境音・BGM で共有する出口を、最初に使うときに作る関数を返す。
 * ブラウザはユーザー操作の前に音を出せないので、AudioContext は最初に鳴らすときに作る
 * （食券を選ぶクリックのあとなので、鳴らせる）。
 * 同じ出口に通すことで、効果音と環境音・BGM が同時に鳴っても最後の圧縮で割れないようにする
 */
export function createAudioOutput(): () => AudioOutput {
  let output: AudioOutput | undefined;
  return () => {
    if (output === undefined) {
      const context = new AudioContext();
      // 音量の合計は 1.0 以下に設計しているが、フィルタの共振で山が出ても割れないよう、最後に圧縮をかける
      const limiter = context.createDynamicsCompressor();
      limiter.threshold.value = -6;
      limiter.knee.value = 0;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.001;
      limiter.release.value = 0.1;
      limiter.connect(context.destination);
      output = { context, destination: limiter };
    }
    if (output.context.state === "suspended") void output.context.resume();
    return output;
  };
}

/**
 * Web Audio で効果音を鳴らす関数を作る。
 * delaySeconds を渡すと、その秒数だけ遅らせて鳴らす。タイマーを使わず Web Audio の時刻で予約するので、
 * 画面の動きに合わせる音でもゲームの進行を止めない。
 * 予約した音は、効果音をオフにしたとき・次のプレイに移るとき・画面を離れるときに stopAll で取り消す
 */
export function createSoundPlayer(
  getOutput: () => AudioOutput = createAudioOutput(),
): {
  play: (cue: SoundCue, delaySeconds?: number) => void;
  /** 鳴っている音と、予約してまだ鳴っていない音をすべて止める */
  stopAll: () => void;
} {
  let noiseBuffer: AudioBuffer | undefined;
  // stopAll で止めるために、鳴り終わるまでの音源を持っておく
  const sources = new Set<AudioScheduledSourceNode>();
  const track = (source: AudioScheduledSourceNode) => {
    sources.add(source);
    source.onended = () => sources.delete(source);
  };
  const stopAll = () => {
    for (const source of sources) {
      try {
        source.stop();
      } catch {
        // 止められない音源があっても、ほかの音は止める
      }
    }
    sources.clear();
  };
  const play = (cue: SoundCue, delaySeconds = 0) => {
    if (SOUND_PATTERNS[cue].layers.length === 0) return;
    try {
      const { context, destination: output } = getOutput();
      noiseBuffer ??= createNoiseBuffer(context);
      const start = context.currentTime + delaySeconds;
      for (const layer of resolveSoundLayers(cue)) {
        const begin = start + layer.delay;
        const end = begin + layer.duration;
        const gain = context.createGain();
        applyEnvelope(gain, layer, begin, end);
        gain.connect(output);
        if (layer.kind === "tone") {
          const oscillator = context.createOscillator();
          oscillator.type = layer.wave;
          oscillator.frequency.setValueAtTime(layer.frequency, begin);
          if (layer.endFrequency !== undefined) {
            oscillator.frequency.exponentialRampToValueAtTime(
              layer.endFrequency,
              end,
            );
          }
          oscillator.connect(gain);
          oscillator.start(begin);
          oscillator.stop(end);
          track(oscillator);
        } else {
          const source = context.createBufferSource();
          source.buffer = noiseBuffer;
          const filter = context.createBiquadFilter();
          filter.type = "bandpass";
          filter.frequency.value = layer.filterFrequency;
          filter.Q.value = layer.q;
          source.connect(filter).connect(gain);
          // 毎回同じ区間を鳴らさないよう、ノイズの読み始めをずらす
          const offset =
            Math.random() * (NOISE_BUFFER_SECONDS - layer.duration);
          source.start(begin, offset, layer.duration);
          track(source);
        }
      }
    } catch {
      // 音が出せない環境でもゲームは続けられるので、何もしない
    }
  };
  return { play, stopAll };
}
