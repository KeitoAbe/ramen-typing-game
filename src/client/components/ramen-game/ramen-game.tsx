"use client";

import { useEffect, useReducer } from "react";
import { RamenResult } from "@/client/components/ramen-game/ramen-result";
import {
  initialRamenGameState,
  ramenGameReducer,
  shuffleOrders,
  TIME_LIMIT_MS,
} from "@/client/lib/ramen-game";
import { summarizePlay } from "@/client/lib/ramen-result";
import { remainingRomaji, typedRomaji } from "@/client/lib/romaji/typing";
import type { Order } from "@/types/order";

type Props = {
  orders: readonly Order[];
};

// キー入力とタイマーを扱うので、クライアントで動かす
export function RamenGame({ orders }: Props) {
  const [state, dispatch] = useReducer(ramenGameReducer, initialRamenGameState);
  const isPlaying = state.status === "playing";

  useEffect(() => {
    if (!isPlaying) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key.length !== 1) return;
      event.preventDefault();
      dispatch({ type: "key", key: event.key.toLowerCase(), now: Date.now() });
    };
    const timer = window.setInterval(() => {
      dispatch({ type: "tick", now: Date.now() });
    }, 100);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPlaying]);

  const start = () => {
    dispatch({ type: "start", orders: shuffleOrders(orders), now: Date.now() });
  };

  if (state.status === "ready") {
    return (
      <section className="flex flex-col items-center gap-6">
        <p className="text-zinc-600 dark:text-zinc-400">
          カウンターに出てくる注文をローマ字で打って、丼を平らげよう。
        </p>
        <button
          type="button"
          onClick={start}
          className="rounded-md bg-red-700 px-6 py-3 font-semibold text-white hover:bg-red-800"
        >
          のれんをくぐる
        </button>
      </section>
    );
  }

  if (state.status === "closed") {
    // 閉店は時間切れでしか起きないので、プレイ時間は制限時間に等しい
    return (
      <RamenResult
        result={summarizePlay(state.stats, TIME_LIMIT_MS)}
        onReplay={start}
      />
    );
  }

  const order = state.orders[state.orderIndex];
  return (
    <section className="flex flex-col gap-8">
      <div className="flex justify-between text-lg">
        <p>
          残り時間:{" "}
          <span className="font-mono font-semibold">
            {Math.ceil(state.remainingMs / 1000)}
          </span>{" "}
          秒
        </p>
        <p>
          平らげた杯数:{" "}
          <span className="font-semibold">{state.stats.servedCount}</span> 杯
        </p>
      </div>
      <div className="flex flex-col items-center gap-3 rounded-lg border border-zinc-300 px-6 py-10 dark:border-zinc-700">
        <p className="text-3xl font-bold">{order.text}</p>
        <p className="text-zinc-600 dark:text-zinc-400">{order.reading}</p>
        <p className="font-mono text-2xl tracking-wide">
          <span className="text-zinc-400 dark:text-zinc-600">
            {typedRomaji(state.typing)}
          </span>
          <span>{remainingRomaji(state.typing)}</span>
        </p>
      </div>
    </section>
  );
}
