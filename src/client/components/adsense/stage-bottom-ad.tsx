import { AdSlot } from "@/client/components/adsense/ad-slot";
import {
  parseAdsensePublisherId,
  parseAdsenseSlotId,
  STAGE_BOTTOM_AD_HEIGHT_PX,
} from "@/client/lib/adsense";

/**
 * 舞台のすぐ下に出す横長の広告（広い画面では 728×90、狭い画面では幅に合わせて縮む）。
 * 券売機や結果画面のボタンはクリックでも押せるので、誤クリックを誘わないよう舞台から 24px 空ける。
 * パブリッシャー ID か広告ユニットの ID が無いときは、枠も出さない
 */
export function StageBottomAd() {
  const publisherId = parseAdsensePublisherId(
    process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID,
  );
  const slotId = parseAdsenseSlotId(
    process.env.NEXT_PUBLIC_ADSENSE_STAGE_BOTTOM_SLOT_ID,
  );
  if (!publisherId || !slotId) return null;
  return (
    <AdSlot
      publisherId={publisherId}
      slotId={slotId}
      height={STAGE_BOTTOM_AD_HEIGHT_PX}
      className="mt-6 w-full max-w-[728px]"
    />
  );
}
