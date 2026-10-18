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
import { isImeKeyInput } from "@/client/lib/ime-input";
import { isPageScrollKey } from "@/client/lib/page-scroll-keys";
import {
  COURSES,
  type Course,
  courseBalance,
  ordersForCourse,
} from "@/client/lib/ramen-course";
import {
  type DailyBestRecord,
  dailyBowlRoll,
  dailyDateKey,
  dailyOrders,
  type PlayMode,
  recordDailyBest,
} from "@/client/lib/ramen-daily";
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
  saveSoundEnabled,
} from "@/client/lib/ramen-sound";
import {
  emptyStampCard,
  loadStampCard,
  recordStampCard,
  type Stamp,
} from "@/client/lib/ramen-stamp-card";
import type { ToppingId } from "@/client/lib/ramen-topping";
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
  // 券売機で選んだ遊び方。もう一杯で券売機に戻っても選んだままにする
  const [playMode, setPlayMode] = useState<PlayMode>("regular");
  // 今日のお題で遊んでいるときの、お題の日付。0 時をまたいで閉店しても、始めた日の記録にする
  const [dailyDate, setDailyDate] = useState<string | null>(null);
  const [dailyBest, setDailyBest] = useState<DailyBestRecord | null>(null);
  // スタンプカードは localStorage にあるので、最初の描画では空とし、マウント後に読み直す
  const [stampCard, setStampCard] = useState(emptyStampCard);
  const [newStamps, setNewStamps] = useState<readonly Stamp[]>([]);
  // 同じプレイを二度記録しないための目印（StrictMode で effect が二度走っても更新判定を崩さない）
  const recordedStatsRef = useRef<PlayStats | null>(null);
  // 音の設定は localStorage にあるので、最初の描画ではオンとしておき、マウント後に読み直す
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [playSound] = useState(createSoundPlayer);
  const [leavingBowl, setLeavingBowl] = useState<LeavingBowl | null>(null);
  const previousStateRef = useRef(state);
  const [shopkeeperMood, setShopkeeperMood] =
    useState<ShopkeeperMood>("normal");
  const moodTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    setIsSoundEnabled(loadSoundEnabled(browserStorage()));
    setStampCard(loadStampCard(browserStorage()));
    return () => window.clearTimeout(moodTimerRef.current);
  }, []);

  const toggleSound = () => {
    const enabled = !isSoundEnabled;
    setIsSoundEnabled(enabled);
    saveSoundEnabled(browserStorage(), enabled);
  };

  // 状態の移り変わりから出来事を読み取り、効果音・店主の表情・丼を下げる演出を出す
  useEffect(() => {
    const previous = previousStateRef.current;
    previousStateRef.current = state;
    if (previous === state) return;
    const events = detectGameEvents(previous, state);
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

  // 閉店したら、そのコースの自己ベストと比べて保存し、スタンプカードに判子を押す。
  // localStorage を使うので effect で行う
  useEffect(() => {
    if (state.status !== "closed") return;
    if (recordedStatsRef.current === state.stats) return;
    recordedStatsRef.current = state.stats;
    const storage = browserStorage();
    const balance = courseBalance(state.stats.bill, state.course);
    setPersonalBest(recordPersonalBest(storage, state.course.id, balance));
    if (dailyDate !== null) {
      setDailyBest(
        recordDailyBest(storage, dailyDate, state.course.id, balance),
      );
    }
    const stampRecord = recordStampCard(
      storage,
      stampCard,
      state.course,
      summarizePlay(state.stats, state.playedMs),
    );
    setStampCard(stampRecord.card);
    setNewStamps(stampRecord.newStamps);
  }, [state, stampCard, dailyDate]);

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
    const now = Date.now();
    const courseOrders = ordersForCourse(orders, course);
    if (playMode === "daily") {
      // 今日のお題は、注文の順番も特別な丼が出る杯も、日付とコースで決める
      const dateKey = dailyDateKey(now);
      setDailyDate(dateKey);
      dispatch({
        type: "start",
        course,
        toppings,
        orders: dailyOrders(courseOrders, dateKey, course.id),
        now,
        rollForBowl: dailyBowlRoll(dateKey, course.id),
      });
      return;
    }
    setDailyDate(null);
    dispatch({
      type: "start",
      course,
      toppings,
      orders: shuffleOrders(courseOrders),
      now,
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
        playMode={playMode}
        onPlayModeChange={setPlayMode}
        onSelect={setTicketCourse}
        stampCard={stampCard}
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
        dailyBest={dailyBest}
        newStamps={newStamps}
        onReplay={() => {
          setPersonalBest(null);
          setDailyBest(null);
          setNewStamps([]);
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
