import type { RamenGameState } from "@/client/lib/ramen-game";

// 画面の切り替えの移り変わり（docs/design.md の「画面の切り替え」）。
// 新しい画面はすぐに出し、その上に移り変わりの絵を重ねて動かす。閉店のときだけは、
// 灯りが落ちるあいだプレイの画面を止めたまま見せてから結果画面に移る

/** ゲームの画面 */
export type GameScene = "ticket" | "topping" | "waiting" | "playing" | "result";

/** 画面の切り替えの移り変わり */
export type SceneTransitionKind =
  /** 券売機 → トッピング: 券売機から出た食券が屋台のカウンターへ渡る */
  | "hand-ticket"
  /** プレイ → 結果: 提灯の灯りが落ちて暗くなってから、伝票が差し出される */
  | "lights-out"
  /** 結果 → 券売機: 屋台の前から券売機の前へ戻る */
  | "back-to-machine";

/** ゲームの状態と、食券を持っているかから、いま出す画面を決める */
export function sceneOf(
  status: RamenGameState["status"],
  hasTicket: boolean,
): GameScene {
  switch (status) {
    case "ready":
      return hasTicket ? "topping" : "ticket";
    case "waiting":
      return "waiting";
    case "playing":
      return "playing";
    case "closed":
      return "result";
  }
}

/** 画面が from から to に替わるときの移り変わり。移り変わりを付けない切り替えなら null */
export function sceneTransitionOf(
  from: GameScene,
  to: GameScene,
): SceneTransitionKind | null {
  if (from === "ticket" && to === "topping") return "hand-ticket";
  if (from === "playing" && to === "result") return "lights-out";
  if (from === "result" && to === "ticket") return "back-to-machine";
  return null;
}

/** 閉店のとき、プレイの画面のまま灯りが落ちる長さ（globals.css の lights-out） */
export const LIGHTS_OUT_SECONDS = 0.3;
/** 閉店のとき、灯りが落ちたあとに伝票が差し出される長さ（globals.css の receipt-hand-over） */
export const RECEIPT_HAND_OVER_SECONDS = 0.25;
/** 動きを抑える設定での移り変わりの長さ。どの切り替えも、夜の色の幕が薄れるだけにする */
const REDUCED_SCENE_TRANSITION_SECONDS = 0.3;

/** 移り変わりの長さ（globals.css の各 @keyframes の長さ） */
const SCENE_TRANSITION_SECONDS: Record<SceneTransitionKind, number> = {
  "hand-ticket": 0.5,
  "lights-out": LIGHTS_OUT_SECONDS + RECEIPT_HAND_OVER_SECONDS,
  "back-to-machine": 0.5,
};

/** 移り変わりが始まってから終わるまでの秒。どれも 0.6 秒以内 */
export function sceneTransitionSeconds(
  kind: SceneTransitionKind,
  isReducedMotion: boolean,
): number {
  return isReducedMotion
    ? REDUCED_SCENE_TRANSITION_SECONDS
    : SCENE_TRANSITION_SECONDS[kind];
}

/**
 * 閉店してから結果画面が出るまでの秒。動きを抑える設定では、灯りが落ちるのを待たずにすぐ出す。
 * 結果画面の演出の時刻（判子の音など）は、この秒だけ遅らせる
 */
export function resultSceneDelaySeconds(isReducedMotion: boolean): number {
  return isReducedMotion ? 0 : LIGHTS_OUT_SECONDS;
}

/** 移り変わりのあと、画面が替わったことをスクリーンリーダーに知らせる文 */
export function sceneAnnouncementOf(scene: GameScene): string {
  switch (scene) {
    case "ticket":
      return "券売機の前に戻りました。食券を選んでください";
    case "topping":
      return "屋台に食券を出しました。トッピングを選んでください";
    case "waiting":
      return "のれんをくぐりました。スペースか Enter で始めます";
    case "playing":
      return "開店しました";
    case "result":
      return "閉店しました。お会計の伝票です";
  }
}
