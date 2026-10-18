import { AdSlot } from "@/client/components/adsense/ad-slot";
import {
  AD_SLOT_HEIGHT_PX,
  parseAdsensePublisherId,
  parseAdsenseSlotId,
} from "@/client/lib/adsense";

/**
 * 紹介の領域（舞台より下）に出す広告。誤クリックを誘わないよう、舞台の中や舞台に重なる位置には置かない。
 * パブリッシャー ID か広告ユニットの ID が無いときは、枠も出さない
 */
export function GuideAd() {
  const publisherId = parseAdsensePublisherId(
    process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID,
  );
  const slotId = parseAdsenseSlotId(process.env.NEXT_PUBLIC_ADSENSE_SLOT_ID);
  if (!publisherId || !slotId) return null;
  return (
    <AdSlot
      publisherId={publisherId}
      slotId={slotId}
      height={AD_SLOT_HEIGHT_PX}
      className="mx-auto w-full max-w-3xl px-5 pb-16 sm:px-8"
    />
  );
}
