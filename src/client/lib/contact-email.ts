/** お問い合わせのメールに最初から入れておく件名 */
const CONTACT_MAIL_SUBJECT = "ラーメン屋台タイピングへのお問い合わせ";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * お問い合わせ先のメールアドレスを、環境変数の値から取り出す。
 * 未設定やメールアドレスの形でない値のときは null を返し、画面では「準備中」と出す
 */
export function parseContactEmail(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed || !EMAIL_PATTERN.test(trimmed)) return null;
  return trimmed;
}

/**
 * メールアドレスを、HTML にそのままの文字列で載せない形にする。
 * 収集ボットに拾われにくくするためのもので、暗号化ではない
 */
export function encodeContactEmail(email: string): string {
  return btoa([...email].reverse().join(""));
}

/** encodeContactEmail で変えた値を、メールアドレスに戻す。戻せない値なら null */
export function decodeContactEmail(encoded: string): string | null {
  try {
    return parseContactEmail([...atob(encoded)].reverse().join(""));
  } catch {
    return null;
  }
}

/** 宛先と件名が入った状態でメールソフトを開く mailto: の URL */
export function contactMailtoHref(email: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(CONTACT_MAIL_SUBJECT)}`;
}
