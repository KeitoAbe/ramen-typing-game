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
  const ids = stageSideAdIds();
  if (!ids) return null;
  const { publisherId, slotId } = ids;
  return (
    <AdSlot
      publisherId={publisherId}
      slotId={slotId}
      height={STAGE_SIDE_AD_HEIGHT_PX}
      className="hidden w-[300px] shrink-0 min-[1360px]:block"
    />
  );
}

/**
 * 舞台の右の枠に使う、パブリッシャー ID と広告ユニットの ID。どちらかが無ければ null。
 * ヘッダーのサイト名を舞台の左端にそろえるのにも使う（右の枠があると舞台が左に寄るため）
 */
export function stageSideAdIds(): {
  publisherId: string;
  slotId: string;
} | null {
  const publisherId = parseAdsensePublisherId(
    process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID,
  );
  const slotId = parseAdsenseSlotId(
    process.env.NEXT_PUBLIC_ADSENSE_STAGE_SIDE_SLOT_ID,
  );
  return publisherId && slotId ? { publisherId, slotId } : null;
}
