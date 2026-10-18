"use client";

import { type ReactNode, useEffect, useReducer, useRef, useState } from "react";
import {
  type LeavingBowl,
  RamenPlay,
} from "@/client/components/ramen-game/ramen-play";
import { RamenResult } from "@/client/components/ramen-game/ramen-result";
import { SoundToggle } from "@/client/components/ramen-game/sound-toggle";
import { TicketMachine } from "@/client/components/ramen-game/ticket-machine";
import { ToppingSelect } from "@/client/components/ramen-game/topping-select";
import { GameStage } from "@/client/components/stage/game-stage";
import {
  trackImeNoticeShown,
  trackPlayEnd,
  trackPlayStart,
  trackReplay,
  trackSoundToggle,
  trackTicketAbandon,
  trackTouchNoticeShown,
} from "@/client/lib/analytics";
import { isImeKeyInput } from "@/client/lib/ime-input";
import { isPageScrollKey } from "@/client/lib/page-scroll-keys";
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
import {
  browserStorage,
  type PersonalBestRecord,
  recordPersonalBest,
} from "@/client/lib/ramen-personal-best";
import { type PlayStats, summarizePlay } from "@/client/lib/ramen-result";
import {
  SHOPKEEPER_MOOD_MS,
  type ShopkeeperMood,
  shopkeeperMoodOf,
} from "@/client/lib/ramen-shopkeeper";
import {
  createSoundPlayer,
  loadSoundEnabled,
  PERSONAL_BEST_AFTER_STAMP_SECONDS,
  type SoundCue,
  STAMP_LANDING_SECONDS,
  saveSoundEnabled,
} from "@/client/lib/ramen-sound";
import { decideTitle } from "@/client/lib/ramen-title";
import type { ToppingId } from "@/client/lib/ramen-topping";
import { prefersReducedMotion } from "@/client/lib/reduced-motion";
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
  // 食券を買ってトッピングを選んでいるあいだの食券。プレイを始めたら null に戻す
  const [ticketCourse, setTicketCourse] = useState<Course | null>(null);
  const [personalBest, setPersonalBest] = useState<PersonalBestRecord | null>(
    null,
  );
  // 同じプレイを二度記録しないための目印（StrictMode で effect が二度走っても更新判定を崩さない）
  const recordedStatsRef = useRef<PlayStats | null>(null);
  // 音の設定は localStorage にあるので、最初の描画ではオンとしておき、マウント後に読み直す
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [{ play: playSound, stopAll: stopSounds }] =
    useState(createSoundPlayer);
  // 判子や自己ベストの音は遅らせて予約しているので、画面を離れたら予約ごと止める
  useEffect(() => () => stopSounds(), [stopSounds]);
  const [leavingBowl, setLeavingBowl] = useState<LeavingBowl | null>(null);
  const previousStateRef = useRef(state);
  const [shopkeeperMood, setShopkeeperMood] =
    useState<ShopkeeperMood>("normal");
  const moodTimerRef = useRef<number | undefined>(undefined);
  // 計測を 1 回に留めるための目印。IME の案内は 1 プレイに 1 回、タッチ端末の案内は 1 ページの表示に 1 回
  const isImeNoticeTrackedRef = useRef(false);
  const isTouchNoticeTrackedRef = useRef(false);
  // ページを離れるときに読む、プレイを始めずに持っている食券
  const ticketCourseRef = useRef<Course | null>(null);

  useEffect(() => {
    setIsSoundEnabled(loadSoundEnabled(browserStorage()));
    return () => window.clearTimeout(moodTimerRef.current);
  }, []);

  /** 効果音がオンのときだけ鳴らす */
  const playCue = (cue: SoundCue) => {
    if (isSoundEnabled) playSound(cue);
  };

  const toggleSound = () => {
    const enabled = !isSoundEnabled;
    setIsSoundEnabled(enabled);
    // 結果画面の判子などは遅らせて予約しているので、オフにしたら予約ごと止める
    if (!enabled) stopSounds();
    saveSoundEnabled(browserStorage(), enabled);
    trackSoundToggle(enabled);
  };

  const trackTouchNotice = () => {
    if (isTouchNoticeTrackedRef.current) return;
    isTouchNoticeTrackedRef.current = true;
    trackTouchNoticeShown();
  };

  // 食券を買ったまま、プレイを始めずにページを離れたら計測する。
  // タブを閉じたときは pagehide、アプリの中で別のページに移ったときはアンマウントで気づく
  useEffect(() => {
    ticketCourseRef.current = ticketCourse;
  }, [ticketCourse]);

  useEffect(() => {
    const trackAbandon = () => {
      const course = ticketCourseRef.current;
      if (course === null) return;
      ticketCourseRef.current = null;
      trackTicketAbandon(course);
    };
    // GA4 のタグが自分の pagehide で送信を済ませる前に積めるよう、capture で先に受ける
    window.addEventListener("pagehide", trackAbandon, { capture: true });
    return () => {
      window.removeEventListener("pagehide", trackAbandon, { capture: true });
      trackAbandon();
    };
  }, []);

  // 状態の移り変わりから出来事を読み取り、効果音・店主の表情・丼を下げる演出を出す
  useEffect(() => {
    const previous = previousStateRef.current;
    previousStateRef.current = state;
    if (previous === state) return;
    const events = detectGameEvents(previous, state);
    if (
      state.status === "playing" &&
      state.isImeNoticeShown &&
      !isImeNoticeTrackedRef.current
    ) {
      isImeNoticeTrackedRef.current = true;
      trackImeNoticeShown(state.course);
    }
    if (isSoundEnabled) {
      for (const event of events) playSound(event);
    }
    // 表情は出来事のたびに付け直し、しばらく何も起きなければ普段の顔に戻す
    const mood = shopkeeperMoodOf(events);
    if (mood !== null) {
      setShopkeeperMood(mood);
      window.clearTimeout(moodTimerRef.current);
      moodTimerRef.current = window.setTimeout(
        () => setShopkeeperMood("normal"),
        SHOPKEEPER_MOOD_MS,
      );
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

  // 閉店したら、プレイを終えたことを計測し、そのコースの自己ベストと比べて保存する。
  // localStorage を使うので effect で行う。判子と自己ベスト更新の音も、1 プレイに 1 回だけここで鳴らす
  useEffect(() => {
    if (state.status !== "closed") return;
    if (recordedStatsRef.current === state.stats) return;
    recordedStatsRef.current = state.stats;
    const balance = courseBalance(state.stats.bill, state.course);
    const record = recordPersonalBest(
      browserStorage(),
      state.course.id,
      balance,
    );
    setPersonalBest(record);
    if (isSoundEnabled) {
      // 動きを抑える設定では判子が最初から押されているので、待たずに鳴らす
      const stampSeconds = prefersReducedMotion() ? 0 : STAMP_LANDING_SECONDS;
      playSound("stamp", stampSeconds);
      if (record.isUpdated) {
        playSound(
          "personalBest",
          stampSeconds + PERSONAL_BEST_AFTER_STAMP_SECONDS,
        );
      }
    }
    const result = summarizePlay(state.stats, state.playedMs);
    trackPlayEnd({
      course: state.course,
      toppings: state.toppings,
      result,
      title: decideTitle(result, state.course),
      isPersonalBest: record.isUpdated,
    });
  }, [state, isSoundEnabled, playSound]);

  useEffect(() => {
    if (!isPlaying) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      // 舞台の下に紹介の文章があるので、プレイ中はキーでページがスクロールしないようにする
      if (isPageScrollKey(event.key)) event.preventDefault();
      // IME がオンのままのキーは打鍵として扱わず、半角英数に切り替えるよう案内する
      if (isImeKeyInput(event)) {
        dispatch({ type: "ime" });
        return;
      }
      if (event.key.length !== 1) return;
      event.preventDefault();
      dispatch({
        type: "key",
        key: event.key.toLowerCase(),
        now: Date.now(),
        roll: Math.random(),
      });
    };
    const timer = window.setInterval(() => {
      dispatch({ type: "tick", now: Date.now(), roll: Math.random() });
    }, 100);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPlaying]);

  const start = (course: Course, toppings: readonly ToppingId[]) => {
    setTicketCourse(null);
    // 食券を使ったので、このあとページを離れても途中でやめたとはみなさない
    ticketCourseRef.current = null;
    isImeNoticeTrackedRef.current = false;
    trackPlayStart(course, toppings);
    dispatch({
      type: "start",
      course,
      toppings,
      orders: shuffleOrders(ordersForCourse(orders, course)),
      now: Date.now(),
      roll: Math.random(),
    });
  };

  if (state.status === "ready" && ticketCourse !== null) {
    return onStage(
      <ToppingSelect
        course={ticketCourse}
        onStart={(toppings) => start(ticketCourse, toppings)}
      />,
    );
  }

  if (state.status === "ready") {
    // 券売機の画面は看板も絵の中に置くので、舞台いっぱいに描く
    return onStage(
      <TicketMachine
        courses={COURSES}
        onSelect={setTicketCourse}
        onBuy={() => playCue("ticket")}
        onTouchNoticeShown={trackTouchNotice}
      />,
    );
  }

  if (state.status === "closed") {
    // 伝票の画面は看板も絵の中に置くので、舞台いっぱいに描く
    return onStage(
      <RamenResult
        course={state.course}
        toppings={state.toppings}
        result={summarizePlay(state.stats, state.playedMs)}
        personalBest={personalBest}
        onReplay={() => {
          trackReplay(state.course);
          // 判子や自己ベストの音が、次の券売機の画面まで残らないようにする
          stopSounds();
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
      shopkeeperMood={shopkeeperMood}
    />,
  );
}
