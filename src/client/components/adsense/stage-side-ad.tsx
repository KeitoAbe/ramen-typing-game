import { AdSlot } from "@/client/components/adsense/ad-slot";
import {
  parseAdsensePublisherId,
  parseAdsenseSlotId,
  STAGE_SIDE_AD_HEIGHT_PX,
} from "@/client/lib/adsense";

/**
 * 舞台の右に出す縦長の広告（300×600）。舞台（960px）・余白（32px）・枠（300px）を並べて収まる
 * 幅 1360px 以上のウィンドウでだけ出し、それより狭いときは隠す（隠した枠には広告を要求しない）。
 * パブリッシャー ID か広告ユニットの ID が無いときは、枠も出さない
 */
export function StageSideAd() {
  const publisherId = parseAdsensePublisherId(
    process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID,
  );
  const slotId = parseAdsenseSlotId(
    process.env.NEXT_PUBLIC_ADSENSE_STAGE_SIDE_SLOT_ID,
  );
  if (!publisherId || !slotId) return null;
  return (
    <AdSlot
      publisherId={publisherId}
      slotId={slotId}
      height={STAGE_SIDE_AD_HEIGHT_PX}
      className="hidden w-[300px] shrink-0 min-[1360px]:block"
    />
  );
}
