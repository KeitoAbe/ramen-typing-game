import Script from "next/script";

type Props = {
  /** GA4 の測定 ID。null のときはタグを一切読み込まない */
  measurementId: string | null;
};

/**
 * GA4 のタグ（gtag.js）を読み込む。
 * ゲームの最初の表示やキー入力を遅らせないよう、gtag.js 本体はブラウザが手すきになってから読み込む。
 * 準備のスクリプトは小さいので先に動かし、それまでに送ったイベントは dataLayer に溜めておく
 */
export function GoogleAnalytics({ measurementId }: Props) {
  if (measurementId === null) return null;
  return (
    <>
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${measurementId}');`}
      </Script>
      <Script
        id="ga4-gtag"
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="lazyOnload"
      />
    </>
  );
}
