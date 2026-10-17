"use client";

import { type ReactNode, useEffect, useReducer, useRef, useState } from "react";
import { BowlIcon } from "@/client/components/ramen-game/bowl-icon";
import { RamenResult } from "@/client/components/ramen-game/ramen-result";
import { SoundToggle } from "@/client/components/ramen-game/sound-toggle";
import { TicketMachine } from "@/client/components/ramen-game/ticket-machine";
import { SOGGY_START_RATIO, soggyLimitMs } from "@/client/lib/ramen-bowl";
import {
  COURSES,
  type Course,
  courseBalance,
  ordersForCourse,
} from "@/client/lib/ramen-course";
import { detectGameEvents } from "@/client/lib/ramen-events";
import {
  initialRamenGameState,
  ramenGameReducer,
  shuffleOrders,
} from "@/client/lib/ramen-game";
import { KAEDAMA_GAUGE_MAX, playTimeMs } from "@/client/lib/ramen-kaedama";
import {
  browserStorage,
  type PersonalBestRecord,
  recordPersonalBest,
} from "@/client/lib/ramen-personal-best";
import { type PlayStats, summarizePlay } from "@/client/lib/ramen-result";
import {
  createSoundPlayer,
  loadSoundEnabled,
  saveSoundEnabled,
} from "@/client/lib/ramen-sound";
import { remainingRomaji, typedRomaji } from "@/client/lib/romaji/typing";
import type { Order } from "@/types/order";

type Props = {
  orders: readonly Order[];
};

/** カウンターから下げている途中の丼 */
type LeavingBowl = {
  /** 丼が替わるたびに変わる値。同じ注文が続いても演出をやり直すために使う */
  id: number;
  text: string;
  reason: "eaten" | "discarded";
};

/** 丼が替わるたびに 1 増える値 */
function bowlIdOf(stats: PlayStats): number {
  return stats.servedCount + stats.discardedCount;
}

// キー入力とタイマーを扱うので、クライアントで動かす
export function RamenGame({ orders }: Props) {
  const [state, dispatch] = useReducer(ramenGameReducer, initialRamenGameState);
  const isPlaying = state.status === "playing";
  const [personalBest, setPersonalBest] = useState<PersonalBestRecord | null>(
    null,
  );
  // 同じプレイを二度記録しないための目印（StrictMode で effect が二度走っても更新判定を崩さない）
  const recordedStatsRef = useRef<PlayStats | null>(null);
  // 音の設定は localStorage にあるので、最初の描画ではオンとしておき、マウント後に読み直す
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [playSound] = useState(createSoundPlayer);
  const [leavingBowl, setLeavingBowl] = useState<LeavingBowl | null>(null);
  const previousStateRef = useRef(state);

  useEffect(() => {
    setIsSoundEnabled(loadSoundEnabled(browserStorage()));
  }, []);

  const toggleSound = () => {
    const enabled = !isSoundEnabled;
    setIsSoundEnabled(enabled);
    saveSoundEnabled(browserStorage(), enabled);
  };

  // 状態の移り変わりから出来事を読み取り、効果音と丼を下げる演出を出す
  useEffect(() => {
    const previous = previousStateRef.current;
    previousStateRef.current = state;
    if (previous === state) return;
    const events = detectGameEvents(previous, state);
    if (isSoundEnabled) {
      for (const event of events) playSound(event);
    }
    if (previous.status !== "playing" || state.status !== "playing") {
      setLeavingBowl(null);
      return;
    }
    // のびきって下げた直後に次の丼を平らげることもあるが、下げていくのは前の丼なので discarded を優先する
    const reason = events.includes("discarded")
      ? "discarded"
      : events.includes("served")
        ? "eaten"
        : null;
    if (reason === null) return;
    setLeavingBowl({
      id: bowlIdOf(state.stats),
      text: previous.orders[previous.orderIndex].text,
      reason,
    });
  }, [state, isSoundEnabled, playSound]);

  const withSoundToggle = (screen: ReactNode) => (
    <div className="flex flex-col gap-4">
      <SoundToggle enabled={isSoundEnabled} onToggle={toggleSound} />
      {screen}
    </div>
  );

  // 閉店したら、そのコースの自己ベストと比べて保存する。localStorage を使うので effect で行う
  useEffect(() => {
    if (state.status !== "closed") return;
    if (recordedStatsRef.current === state.stats) return;
    recordedStatsRef.current = state.stats;
    setPersonalBest(
      recordPersonalBest(
        browserStorage(),
        state.course.id,
        courseBalance(state.stats.bill, state.course),
      ),
    );
  }, [state]);

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

  const start = (course: Course) => {
    dispatch({
      type: "start",
      course,
      orders: shuffleOrders(ordersForCourse(orders, course)),
      now: Date.now(),
    });
  };

  if (state.status === "ready") {
    return withSoundToggle(
      <TicketMachine courses={COURSES} onSelect={start} />,
    );
  }

  if (state.status === "closed") {
    // 閉店は時間切れでしか起きないので、プレイ時間は制限時間に替え玉で延びた分を足したもの
    return withSoundToggle(
      <RamenResult
        course={state.course}
        result={summarizePlay(
          state.stats,
          playTimeMs(state.course.timeLimitMs, state.stats.kaedamaCount),
        )}
        personalBest={personalBest}
        onReplay={() => {
          setPersonalBest(null);
          // 入力のないプレイは毎回同じ emptyPlayStats で閉店するので、目印も戻しておく
          recordedStatsRef.current = null;
          dispatch({ type: "reset" });
        }}
      />,
    );
  }

  const order = state.orders[state.orderIndex];
  const freshness = state.orderRemainingMs / soggyLimitMs(order);
  const isGettingSoggy = freshness < 1 - SOGGY_START_RATIO;
  return withSoundToggle(
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
      <div className="relative flex flex-col items-center gap-3 overflow-hidden rounded-lg border border-zinc-300 px-6 py-10 dark:border-zinc-700">
        {leavingBowl && (
          // 動きを抑える設定では animationend が来ず残ってしまうので、下げる丼ごと出さない
          <div
            key={leavingBowl.id}
            aria-hidden="true"
            onAnimationEnd={() => setLeavingBowl(null)}
            className={`pointer-events-none absolute inset-x-0 top-4 hidden flex-col items-center gap-1 motion-safe:flex ${leavingBowl.reason === "eaten" ? "motion-safe:animate-bowl-eaten" : "motion-safe:animate-bowl-discarded"}`}
          >
            <BowlIcon isSoggy={leavingBowl.reason === "discarded"} />
            <p className="text-sm text-zinc-500">{leavingBowl.text}</p>
          </div>
        )}
        {/* 丼が替わるたびに作り直して、カウンターに出てくる演出をやり直す */}
        <div
          key={bowlIdOf(state.stats)}
          className="flex flex-col items-center gap-3 motion-safe:animate-bowl-serve"
        >
          <BowlIcon />
          <p className="text-3xl font-bold">{order.text}</p>
          <p className="text-zinc-600 dark:text-zinc-400">{order.reading}</p>
          <p className="font-mono text-2xl tracking-wide">
            <span className="text-zinc-400 dark:text-zinc-600">
              {typedRomaji(state.typing)}
            </span>
            <span>{remainingRomaji(state.typing)}</span>
          </p>
        </div>
        <div className="mt-4 flex w-full max-w-sm flex-col gap-1">
          <p
            className={`text-sm ${isGettingSoggy ? "font-semibold text-blue-700 dark:text-blue-400" : "text-zinc-600 dark:text-zinc-400"}`}
          >
            {/* 切り替わりだけを読み上げる。毎秒変わる残り秒数は含めない */}
            <span aria-live="polite">
              {isGettingSoggy ? "のびかけ" : "できたて"}
            </span>
            ・のびるまで{" "}
            <span className="font-mono">
              {Math.ceil(state.orderRemainingMs / 1000)}
            </span>{" "}
            秒
          </p>
          <div
            role="progressbar"
            aria-label="麺がのびるまでの残り時間"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(freshness * 100)}
            className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
          >
            <div
              className={`h-full ${isGettingSoggy ? "bg-blue-600" : "bg-red-700"}`}
              style={{ width: `${freshness * 100}%` }}
            />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          替え玉ゲージ（ミスなしで {KAEDAMA_GAUGE_MAX} 打で制限時間が延びる）
          <span
            aria-live="polite"
            className="ml-2 font-bold text-red-700 dark:text-red-400"
          >
            {state.isKaedamaNoticeShown && (
              // 替え玉のたびに作り直して、飛び出す演出をやり直す
              <span
                key={state.stats.kaedamaCount}
                className="inline-block motion-safe:animate-kaedama-pop"
              >
                替え玉！
              </span>
            )}
          </span>
        </p>
        <div
          role="progressbar"
          aria-label="替え玉ゲージ"
          aria-valuemin={0}
          aria-valuemax={KAEDAMA_GAUGE_MAX}
          aria-valuenow={state.kaedamaGauge}
          className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
        >
          <div
            className="h-full bg-amber-500"
            style={{
              width: `${(state.kaedamaGauge / KAEDAMA_GAUGE_MAX) * 100}%`,
            }}
          />
        </div>
      </div>
    </section>,
  );
}
