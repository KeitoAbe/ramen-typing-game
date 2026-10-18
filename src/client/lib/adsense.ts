/**
 * 広告枠が確保する高さ（px）。読み込みの前後でレイアウトがずれないよう、先に場所を取っておく。
 * 紹介の後ろの枠・舞台の下の横長の枠（728×90）・舞台の右の縦長の枠（300×600）の順
 */
export const AD_SLOT_HEIGHT_PX = 280;
export const STAGE_BOTTOM_AD_HEIGHT_PX = 90;
export const STAGE_SIDE_AD_HEIGHT_PX = 600;

/** ads.txt に書く、Google の認証機関 ID（アドセンスで共通の固定値） */
const GOOGLE_CERTIFICATION_AUTHORITY_ID = "f08c47fec0942fa0";

/**
 * アドセンスのパブリッシャー ID を、環境変数の値から取り出して `ca-pub-…` の形にそろえる。
 * `pub-…` の形でも受け付ける。数字は Google の形式どおり 16 桁に限る。
 * 未設定や形が違う値のときは null を返し、広告まわりを何も出さない
 */
export function parseAdsensePublisherId(
  value: string | undefined,
): string | null {
  const match = value?.trim().match(/^(?:ca-)?pub-(\d{16})$/);
  return match ? `ca-pub-${match[1]}` : null;
}

/** 広告ユニットの ID（数字だけ）を、環境変数の値から取り出す。未設定や形が違う値のときは null */
export function parseAdsenseSlotId(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed && /^\d+$/.test(trimmed) ? trimmed : null;
}

/** head で読み込むアドセンスのスクリプトの URL */
export function adsenseScriptSrc(publisherId: string): string {
  return `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`;
}

/** `/ads.txt` の中身。パブリッシャー ID の `ca-` を外して書く */
export function buildAdsTxt(publisherId: string): string {
  const pubId = publisherId.replace(/^ca-/, "");
  return `google.com, ${pubId}, DIRECT, ${GOOGLE_CERTIFICATION_AUTHORITY_ID}\n`;
}
