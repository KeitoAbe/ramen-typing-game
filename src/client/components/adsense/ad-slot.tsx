"use client";

import { useEffect } from "react";
import { AD_SLOT_HEIGHT_PX } from "@/client/lib/adsense";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

type AdSlotProps = { publisherId: string; slotId: string };

/**
 * 紹介の領域に置く広告枠。高さを先に確保して、広告の読み込みの前後でレイアウトをずらさない。
 * 広告の要求は描画後の effect で出すので、最初の表示やキー入力を待たせない
 */
export function AdSlot({ publisherId, slotId }: AdSlotProps) {
  useEffect(() => {
    try {
      window.adsbygoogle = window.adsbygoogle ?? [];
      window.adsbygoogle.push({});
    } catch {
      // 広告ブロッカーなどで失敗しても、ゲームには影響させない
    }
  }, []);

  return (
    <aside
      aria-label="広告"
      className="mx-auto w-full max-w-3xl px-5 pb-16 sm:px-8"
    >
      <p className="mb-2 text-xs text-yatai-kinari/70">広告</p>
      <div
        className="w-full overflow-hidden"
        style={{ height: AD_SLOT_HEIGHT_PX }}
      >
        <ins
          className="adsbygoogle"
          style={{ display: "block", width: "100%", height: AD_SLOT_HEIGHT_PX }}
          data-ad-client={publisherId}
          data-ad-slot={slotId}
          data-full-width-responsive="false"
        />
      </div>
    </aside>
  );
}
