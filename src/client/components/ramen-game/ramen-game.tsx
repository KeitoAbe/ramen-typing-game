"use client";

import { type ReactNode, useEffect, useReducer, useRef, useState } from "react";
import {
  type LeavingBowl,
  RamenPlay,
} from "@/client/components/ramen-game/ramen-play";
import { RamenResult } from "@/client/components/ramen-game/ramen-result";
import { SoundToggle } from "@/client/components/ramen-game/sound-toggle";
import { TicketMachine } from "@/client/components/ramen-game/ticket-machine";
import { GameStage } from "@/client/components/stage/game-stage";
import { StageSign } from "@/client/components/stage/stage-sign";
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
import { playTimeMs } from "@/client/lib/ramen-kaedama";
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
import type { Order } from "@/types/order";

type Props = {
  orders: readonly Order[];
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
      order: previous.orders[previous.orderIndex],
      reason,
    });
  }, [state, isSoundEnabled, playSound]);

  const onStage = (screen: ReactNode) => (
    <GameStage
      corner={<SoundToggle enabled={isSoundEnabled} onToggle={toggleSound} />}
    >
      {screen}
    </GameStage>
  );

  // 券売機と結果の画面は、看板の下に中身を並べる。舞台に収まらない分は舞台の中でスクロールする
  const withSign = (screen: ReactNode) =>
    onStage(
      <div className="absolute inset-0 flex flex-col items-center gap-6 overflow-y-auto px-[4cqw] py-[3cqw]">
        <StageSign />
        {screen}
      </div>,
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
    return withSign(<TicketMachine courses={COURSES} onSelect={start} />);
  }

  if (state.status === "closed") {
    // 閉店は時間切れでしか起きないので、プレイ時間は制限時間に替え玉で延びた分を足したもの
    return withSign(
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

  return onStage(
    <RamenPlay
      state={state}
      bowlId={bowlIdOf(state.stats)}
      leavingBowl={leavingBowl}
      onLeavingBowlEnd={() => setLeavingBowl(null)}
    />,
  );
}
