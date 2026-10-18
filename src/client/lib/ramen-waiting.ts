import { isImeKeyInput } from "@/client/lib/ime-input";

/** 始めるのを待っているところで押されたキーへの応じ方 */
export type WaitingKeyAction =
  /** プレイを始める */
  | "open"
  /** 日本語入力（IME）がオンのままなので、半角英数に切り替えるよう案内する */
  | "ime"
  /** 何もしない */
  | "ignore";

/** キー入力のうち、始めるかの判定に使う部分（KeyboardEvent の一部） */
type WaitingKeyInput = Pick<
  KeyboardEvent,
  | "key"
  | "isComposing"
  | "keyCode"
  | "repeat"
  | "ctrlKey"
  | "metaKey"
  | "altKey"
>;

/** プレイを始めるキー（KeyboardEvent の key）。スペースと Enter */
const OPEN_KEYS: ReadonlySet<string> = new Set([" ", "Enter"]);

/**
 * 始めるのを待っているところで押されたキーに、どう応じるかを決める。
 * 「いただきます」を押したまま続いたキー（押しっぱなしの繰り返し）では始めない
 */
export function waitingKeyAction(input: WaitingKeyInput): WaitingKeyAction {
  if (input.ctrlKey || input.metaKey || input.altKey) return "ignore";
  if (isImeKeyInput(input)) return "ime";
  if (input.repeat || !OPEN_KEYS.has(input.key)) return "ignore";
  return "open";
}
