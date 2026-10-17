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

/** 効果音を組み立てる 1 音 */
type Tone = {
  /** 周波数（Hz） */
  frequency: number;
  /** 鳴らし始めるまでの遅れ（秒） */
  delay: number;
  /** 鳴らす長さ（秒） */
  duration: number;
  wave: OscillatorType;
  /** 音量（0〜1） */
  volume: number;
};

/**
 * 出来事ごとの効果音。外部の音源は使わず、ブラウザで合成する。
 * 丼を下げられたときは、のびていることが画面の動きで分かるので鳴らさない
 */
export const SOUND_PATTERNS: Readonly<Record<RamenGameEvent, readonly Tone[]>> =
  {
    correct: [
      {
        frequency: 880,
        delay: 0,
        duration: 0.04,
        wave: "square",
        volume: 0.05,
      },
    ],
    miss: [
      {
        frequency: 140,
        delay: 0,
        duration: 0.12,
        wave: "sawtooth",
        volume: 0.08,
      },
    ],
    served: [
      {
        frequency: 660,
        delay: 0,
        duration: 0.08,
        wave: "triangle",
        volume: 0.2,
      },
      {
        frequency: 990,
        delay: 0.08,
        duration: 0.12,
        wave: "triangle",
        volume: 0.2,
      },
    ],
    discarded: [],
    kaedama: [
      {
        frequency: 523,
        delay: 0,
        duration: 0.08,
        wave: "square",
        volume: 0.08,
      },
      {
        frequency: 659,
        delay: 0.08,
        duration: 0.08,
        wave: "square",
        volume: 0.08,
      },
      {
        frequency: 784,
        delay: 0.16,
        duration: 0.16,
        wave: "square",
        volume: 0.08,
      },
    ],
    closed: [
      {
        frequency: 784,
        delay: 0,
        duration: 0.2,
        wave: "triangle",
        volume: 0.2,
      },
      {
        frequency: 587,
        delay: 0.2,
        duration: 0.2,
        wave: "triangle",
        volume: 0.2,
      },
      {
        frequency: 392,
        delay: 0.4,
        duration: 0.4,
        wave: "triangle",
        volume: 0.2,
      },
    ],
  };

/**
 * Web Audio で効果音を鳴らす関数を作る。
 * ブラウザはユーザー操作の前に音を出せないので、AudioContext は最初に鳴らすときに作る
 * （食券を選ぶクリックのあとなので、鳴らせる）
 */
export function createSoundPlayer(): (event: RamenGameEvent) => void {
  let context: AudioContext | undefined;
  return (event) => {
    const tones = SOUND_PATTERNS[event];
    if (tones.length === 0) return;
    try {
      context ??= new AudioContext();
      if (context.state === "suspended") void context.resume();
      const start = context.currentTime;
      for (const tone of tones) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = tone.wave;
        oscillator.frequency.value = tone.frequency;
        const begin = start + tone.delay;
        const end = begin + tone.duration;
        // 鳴り終わりのプツッという音を避けるため、音量を絞ってから止める
        gain.gain.setValueAtTime(tone.volume, begin);
        gain.gain.exponentialRampToValueAtTime(0.0001, end);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(begin);
        oscillator.stop(end);
      }
    } catch {
      // 音が出せない環境でもゲームは続けられるので、何もしない
    }
  };
}
