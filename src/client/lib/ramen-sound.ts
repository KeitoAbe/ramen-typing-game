import type { RamenGameEvent } from "@/client/lib/ramen-events";
import type { PersonalBestStorage } from "@/client/lib/ramen-personal-best";

/** 音のオン・オフを保存する localStorage のキー */
export const SOUND_SETTING_STORAGE_KEY = "ramen-game:sound-enabled";

/** 保存先。テストで差し替えられるよう、使うメソッドだけに絞る */
type SoundSettingStorage = PersonalBestStorage;

/** 保存された音の設定を読む。保存されていない・読めないときはオン */
export function loadSoundEnabled(
  storage: SoundSettingStorage | undefined,
): boolean {
  try {
    return storage?.getItem(SOUND_SETTING_STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

/** 音の設定を保存する。保存できなくてもゲームは続けられるので、例外は投げない */
export function saveSoundEnabled(
  storage: SoundSettingStorage | undefined,
  enabled: boolean,
): void {
  try {
    storage?.setItem(SOUND_SETTING_STORAGE_KEY, enabled ? "on" : "off");
  } catch {
    // 何もしない
  }
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

/** 拍子木を 1 回打った音。乾いたカツッ（ノイズ）に、木の胴の高い響き（発振器 2 つ）を重ねる */
function hyoshigiStrike(delay: number): readonly SoundLayer[] {
  return [
    {
      kind: "noise",
      filterFrequency: 2400,
      q: 6,
      delay,
      duration: 0.06,
      attack: 0.001,
      volume: 0.07,
    },
    {
      kind: "tone",
      wave: "sine",
      frequency: 1760,
      endFrequency: 1720,
      delay,
      duration: 0.5,
      attack: 0.002,
      volume: 0.06,
    },
    {
      // 木の響きらしさを出すため、倍音から外れた高さを薄く重ねる
      kind: "tone",
      wave: "sine",
      frequency: 4580,
      delay,
      duration: 0.12,
      attack: 0.001,
      volume: 0.02,
    },
  ];
}

/**
 * 出来事ごとの効果音。外部の音源は使わず、ブラウザで合成する。
 * 丼を下げられたときは、のびていることが画面の動きで分かるので鳴らさない
 */
export const SOUND_PATTERNS: Readonly<Record<RamenGameEvent, SoundPattern>> = {
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
};

/**
 * 鳴らす層を決める。pitchVariation があれば、高さ（発振器の周波数とノイズのフィルタ）を
 * 同じ割合で揺らす。random は 0 以上 1 未満を返す関数で、テストで差し替えられる
 */
export function resolveSoundLayers(
  event: RamenGameEvent,
  random: () => number = Math.random,
): readonly SoundLayer[] {
  const { layers, pitchVariation } = SOUND_PATTERNS[event];
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

/**
 * Web Audio で効果音を鳴らす関数を作る。
 * ブラウザはユーザー操作の前に音を出せないので、AudioContext は最初に鳴らすときに作る
 * （食券を選ぶクリックのあとなので、鳴らせる）
 */
export function createSoundPlayer(): (event: RamenGameEvent) => void {
  let context: AudioContext | undefined;
  let output: AudioNode | undefined;
  let noiseBuffer: AudioBuffer | undefined;
  return (event) => {
    if (SOUND_PATTERNS[event].layers.length === 0) return;
    try {
      context ??= new AudioContext();
      if (context.state === "suspended") void context.resume();
      if (output === undefined) {
        // 音量の合計は 1.0 以下に設計しているが、フィルタの共振で山が出ても割れないよう、最後に圧縮をかける
        const limiter = context.createDynamicsCompressor();
        limiter.threshold.value = -6;
        limiter.knee.value = 0;
        limiter.ratio.value = 20;
        limiter.attack.value = 0.001;
        limiter.release.value = 0.1;
        limiter.connect(context.destination);
        output = limiter;
      }
      noiseBuffer ??= createNoiseBuffer(context);
      const start = context.currentTime;
      for (const layer of resolveSoundLayers(event)) {
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
        }
      }
    } catch {
      // 音が出せない環境でもゲームは続けられるので、何もしない
    }
  };
}
