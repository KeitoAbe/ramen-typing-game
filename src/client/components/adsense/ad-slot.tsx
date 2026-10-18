"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

type AdSlotProps = {
  publisherId: string;
  slotId: string;
  /** 枠が確保する高さ（px） */
  height: number;
  /** 枠（aside）の置き場所と幅を決めるクラス */
  className: string;
};

/**
 * 広告枠。高さを先に確保して、広告の読み込みの前後でレイアウトをずらさない。
 * 広告の要求は描画後の effect で出すので、最初の表示やキー入力を待たせない
 */
export function AdSlot({
  publisherId,
  slotId,
  height,
  className,
}: AdSlotProps) {
  const insRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    // 狭い画面で隠している枠（display: none）には、広告を要求しない
    if (!insRef.current || insRef.current.getClientRects().length === 0) return;
    try {
      window.adsbygoogle = window.adsbygoogle ?? [];
      window.adsbygoogle.push({});
    } catch {
      // 広告ブロッカーなどで失敗しても、ゲームには影響させない
    }
  }, []);

  return (
    <aside aria-label="広告" className={className}>
      <p className="mb-2 text-xs text-yatai-kinari/70">広告</p>
      <div className="w-full overflow-hidden" style={{ height }}>
        <ins
          ref={insRef}
          className="adsbygoogle"
          style={{ display: "block", width: "100%", height }}
          data-ad-client={publisherId}
          data-ad-slot={slotId}
          data-full-width-responsive="false"
        />
      </div>
    </aside>
  );
}
