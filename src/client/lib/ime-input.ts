/** IME が変換中のキーを押したときに、ブラウザが keyCode に入れる値 */
const IME_PROCESS_KEY_CODE = 229;

/** キー入力のうち、IME の判定に使う部分（KeyboardEvent の一部） */
type ImeKeyInput = Pick<KeyboardEvent, "key" | "isComposing" | "keyCode">;

/**
 * 日本語入力（IME）がオンのまま押されたキーか。
 * ブラウザによって key が "Process" になったり、isComposing が true になったり、
 * keyCode が 229 になったりするので、どれか 1 つでも当てはまれば IME の入力とみなす
 */
export function isImeKeyInput({
  key,
  isComposing,
  keyCode,
}: ImeKeyInput): boolean {
  return isComposing || key === "Process" || keyCode === IME_PROCESS_KEY_CODE;
}
