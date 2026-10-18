/**
 * お問い合わせ先の Google フォームの URL を、環境変数の値から取り出す。
 * 未設定や http(s) でない値のときは null を返し、画面では「準備中」と出す
 */
export function parseContactFormUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}
