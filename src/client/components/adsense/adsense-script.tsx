import {
  adsenseScriptSrc,
  parseAdsensePublisherId,
} from "@/client/lib/adsense";

/**
 * head に置くアドセンスのスクリプト。サーバーで描いた HTML に含めて、審査用のコードとしても使う。
 * async なので HTML の解析や最初の表示を止めない。パブリッシャー ID が無いときは何も出さない
 */
export function AdsenseScript() {
  // NEXT_PUBLIC_ の変数はビルド時に値が埋め込まれるので、実行時に環境変数が渡らないホスティングでも読める
  const publisherId = parseAdsensePublisherId(
    process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID,
  );
  if (!publisherId) return null;
  return (
    <script async src={adsenseScriptSrc(publisherId)} crossOrigin="anonymous" />
  );
}
