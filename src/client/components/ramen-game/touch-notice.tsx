import { useEffect, useSyncExternalStore } from "react";
import {
  isTouchPrimaryDevice,
  TOUCH_PRIMARY_QUERY,
} from "@/client/lib/touch-device";

/** 端末の入力の変化（タブレットにマウスをつないだときなど）を見張る */
function subscribeTouchPrimary(onChange: () => void) {
  // 判定と同じく、matchMedia が無い環境では見張らない
  const query = window.matchMedia?.(TOUCH_PRIMARY_QUERY);
  if (!query) return () => {};
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * 主な入力がタッチの端末か。サーバーで描くときと水和（hydration）のときは false にして、
 * 画面の食い違いを起こさない
 */
function useIsTouchPrimaryDevice() {
  return useSyncExternalStore(
    subscribeTouchPrimary,
    () => isTouchPrimaryDevice(),
    () => false,
  );
}

type Props = {
  /** 案内を出したときに呼ぶ（計測用） */
  onShown: () => void;
};

/**
 * タッチ端末への案内。舞台の上に掛ける木の札。
 * 縦向きのスマホでは舞台が小さく、夜空に札を掲げる隙間が無いので、舞台の中には置かない
 */
export function TouchNotice({ onShown }: Props) {
  const isTouchPrimary = useIsTouchPrimaryDevice();

  useEffect(() => {
    if (isTouchPrimary) onShown();
  }, [isTouchPrimary, onShown]);

  if (!isTouchPrimary) return null;
  return (
    <p className="mb-2 px-2 text-center">
      <span className="inline-flex stage-wood-board flex-col items-center px-3 py-1 font-bold">
        <span className="text-sm leading-tight text-yatai-amber">
          PC のキーボードで遊んでください
        </span>
        <span className="text-xs leading-tight">
          タッチ操作では文字を打てません
        </span>
      </span>
    </p>
  );
}
