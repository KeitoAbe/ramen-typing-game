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
    const ins = insRef.current;
    if (!ins) return;
    const requestAd = () => {
      try {
        window.adsbygoogle = window.adsbygoogle ?? [];
        window.adsbygoogle.push({});
      } catch {
        // 広告ブロッカーなどで失敗しても、ゲームには影響させない
      }
    };
    const isShown = () => ins.getClientRects().length > 0;
    if (isShown()) {
      requestAd();
      return;
    }
    // 狭い画面で隠している枠（display: none）には広告を要求せず、
    // ウィンドウを広げるなどして表示されたときに一度だけ要求する
    const observer = new ResizeObserver(() => {
      if (!isShown()) return;
      observer.disconnect();
      requestAd();
    });
    observer.observe(ins);
    return () => observer.disconnect();
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
