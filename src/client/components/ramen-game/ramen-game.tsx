"use client";

import { type ReactNode, useEffect, useReducer, useRef, useState } from "react";
import {
  type LeavingBowl,
  RamenPlay,
} from "@/client/components/ramen-game/ramen-play";
import { RamenResult } from "@/client/components/ramen-game/ramen-result";
import { RamenWaiting } from "@/client/components/ramen-game/ramen-waiting";
import { SceneTransitionOverlay } from "@/client/components/ramen-game/scene-transition-overlay";
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
  createAmbiencePlayer,
  loadAmbienceEnabled,
  saveAmbienceEnabled,
  shouldPlayAmbience,
} from "@/client/lib/ramen-ambience";
import {
  COURSES,
  type Course,
  courseBalance,
  ordersForCourse,
} from "@/client/lib/ramen-course";
import { detectGameEvents } from "@/client/lib/ramen-events";
import {
  initialRamenGameState,
  type RamenGameState,
  ramenGameReducer,
  shuffleOrders,
} from "@/client/lib/ramen-game";
import {
  browserStorage,
  type PersonalBestRecord,
  recordPersonalBest,
} from "@/client/lib/ramen-personal-best";
import {
  eatenRatio,
  type ServedPricePop,
  servedPricePopOf,
} from "@/client/lib/ramen-play-motion";
import { type PlayStats, summarizePlay } from "@/client/lib/ramen-result";
import {
  SHOPKEEPER_MOOD_MS,
  type ShopkeeperMood,
  shopkeeperMoodOf,
} from "@/client/lib/ramen-shopkeeper";
import {
  createAudioOutput,
  createSoundPlayer,
  loadSoundEnabled,
  PERSONAL_BEST_AFTER_STAMP_SECONDS,
  type SoundCue,
  STAMP_LANDING_SECONDS,
  saveSoundEnabled,
} from "@/client/lib/ramen-sound";
import { decideTitle } from "@/client/lib/ramen-title";
import type { ToppingId } from "@/client/lib/ramen-topping";
import { waitingKeyAction } from "@/client/lib/ramen-waiting";
import { prefersReducedMotion } from "@/client/lib/reduced-motion";
import {
  type GameScene,
  resultSceneDelaySeconds,
  type SceneTransitionKind,
  sceneAnnouncementOf,
  sceneOf,
  sceneTransitionOf,
  sceneTransitionSeconds,
} from "@/client/lib/scene-transition";
import type { Order } from "@/types/order";

type Props = {
  orders: readonly Order[];
};

type PlayingState = Extract<RamenGameState, { status: "playing" }>;

/** いま動いている画面の切り替えの移り変わり。id は同じ種類が続いても動きをやり直すための通し番号 */
type SceneTransition = { kind: SceneTransitionKind; id: number };

/** 丼が替わるたびに 1 増える値 */
function bowlIdOf(stats: PlayStats): number {
  return stats.servedCount + stats.discardedCount;
}

/**
 * 画面の切り替えのあと、次の画面の最初の操作できる要素にフォーカスを移す。
 * data-scene-focus を付けた要素があればそれを、操作できる要素がなければ見出しを選ぶ
 */
function focusSceneStart(container: HTMLElement | null) {
  const target =
    container?.querySelector<HTMLElement>("[data-scene-focus]") ??
    container?.querySelector<HTMLElement>(
      "button:not(:disabled), input:not(:disabled), a[href]",
    ) ??
    container?.querySelector<HTMLElement>("h1, h2");
  if (target === null || target === undefined) return;
  // 見出しはそのままではフォーカスできないので、スクリプトからだけフォーカスできるようにする
  if (target.tabIndex < 0 && !target.hasAttribute("tabindex")) {
    target.tabIndex = -1;
  }
  // 舞台の下に紹介の文章があるので、フォーカスでページをスクロールさせない
  target.focus({ preventScroll: true });
}

// キー入力とタイマーを扱うので、クライアントで動かす
export function RamenGame({ orders }: Props) {
  const [state, dispatch] = useReducer(ramenGameReducer, initialRamenGameState);
  const isPlaying = state.status === "playing";
  const isWaiting = state.status === "waiting";
  // 食券を買ってトッピングを選んでいるあいだの食券。プレイを始めたら null に戻す
  const [ticketCourse, setTicketCourse] = useState<Course | null>(null);
  const [personalBest, setPersonalBest] = useState<PersonalBestRecord | null>(
    null,
  );
  // 同じプレイを二度記録しないための目印（StrictMode で effect が二度走っても更新判定を崩さない）
  const recordedStatsRef = useRef<PlayStats | null>(null);
  // 音の設定は localStorage にあるので、最初の描画ではオンとしておき、マウント後に読み直す
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isAmbienceEnabled, setIsAmbienceEnabled] = useState(true);
  const [isPageVisible, setIsPageVisible] = useState(true);
  // 効果音と環境音・BGM は同じ出口を通して、同時に鳴っても割れないようにする
  const [
    {
      sound: { play: playSound, stopAll: stopSounds },
      ambience,
    },
  ] = useState(() => {
    const getOutput = createAudioOutput();
    return {
      sound: createSoundPlayer(getOutput),
      ambience: createAmbiencePlayer(getOutput),
    };
  });
  // 判子や自己ベストの音は遅らせて予約しているので、画面を離れたら予約ごと止める
  useEffect(() => () => stopSounds(), [stopSounds]);
  useEffect(() => () => ambience.stop(), [ambience]);
  const [leavingBowl, setLeavingBowl] = useState<LeavingBowl | null>(null);
  const [pricePop, setPricePop] = useState<ServedPricePop | null>(null);
  const previousStateRef = useRef(state);

  // 画面の切り替えの移り変わり（docs/design.md の「画面の切り替え」）。
  // 画面が替わったことを描画の中で読み取り、同じ描画で移り変わりを始める（替わった画面が一瞬だけ素のまま出ないように）
  const scene = sceneOf(state.status, ticketCourse !== null);
  const [shownScene, setShownScene] = useState<GameScene>(scene);
  const [sceneTransition, setSceneTransition] =
    useState<SceneTransition | null>(null);
  // 閉店して灯りが落ちるあいだ、止めたまま見せるプレイの画面。null なら結果画面を出す
  const [closingPlay, setClosingPlay] = useState<PlayingState | null>(null);
  const [sceneAnnouncement, setSceneAnnouncement] = useState("");
  const sceneRef = useRef<HTMLDivElement>(null);
  if (scene !== shownScene) {
    setShownScene(scene);
    const kind = sceneTransitionOf(shownScene, scene);
    // 移り変わりの途中で次の画面に移ったら、移り変わりを打ち切る
    setSceneTransition((current) =>
      kind === null ? null : { kind, id: (current?.id ?? 0) + 1 },
    );
    // 移り変わりを付けない切り替え（開始待ち → プレイなど）でも、画面が替わったことは知らせる
    setSceneAnnouncement(sceneAnnouncementOf(scene));
    // previousStateRef は描画のあとの effect で更新するので、ここではまだ閉店する直前のプレイの状態を指している
    const lastPlay = previousStateRef.current;
    setClosingPlay(
      kind === "lights-out" &&
        lastPlay.status === "playing" &&
        !prefersReducedMotion()
        ? lastPlay
        : null,
    );
  }

  // 移り変わりを終えたら外し、次の画面の最初の操作できる要素にフォーカスを移す
  useEffect(() => {
    if (sceneTransition === null) return;
    const isReducedMotion = prefersReducedMotion();
    const lightsOutTimer = window.setTimeout(
      () => setClosingPlay(null),
      resultSceneDelaySeconds(isReducedMotion) * 1000,
    );
    const endTimer = window.setTimeout(() => {
      setSceneTransition(null);
      focusSceneStart(sceneRef.current);
    }, sceneTransitionSeconds(sceneTransition.kind, isReducedMotion) * 1000);
    return () => {
      window.clearTimeout(lightsOutTimer);
      window.clearTimeout(endTimer);
    };
  }, [sceneTransition]);

  // トッピングと開始待ちへは移り変わりを付けないので、切り替わったその場で最初のトッピング・始め方の案内にフォーカスを移す
  useEffect(() => {
    if (shownScene === "topping" || shownScene === "waiting")
      focusSceneStart(sceneRef.current);
  }, [shownScene]);

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
    setIsAmbienceEnabled(loadAmbienceEnabled(browserStorage()));
    return () => window.clearTimeout(moodTimerRef.current);
  }, []);

  // タブが裏に回ったら環境音・BGM を止め、戻ったら再開する
  useEffect(() => {
    const update = () =>
      setIsPageVisible(document.visibilityState === "visible");
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  // 環境音・BGM はプレイ中だけ流す。画面が切り替わるときは、プレイヤーの側でフェードする
  useEffect(() => {
    ambience.setActive(
      shouldPlayAmbience({
        status: state.status,
        enabled: isAmbienceEnabled,
        visible: isPageVisible,
      }),
    );
  }, [ambience, state.status, isAmbienceEnabled, isPageVisible]);

  const isClosingRushNow = state.status === "playing" && state.isClosingRush;
  useEffect(() => {
    ambience.setClosingRush(isClosingRushNow);
  }, [ambience, isClosingRushNow]);

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

  // 環境音・BGM の切り替えは、効果音の sound_toggle には混ぜず、計測もしない
  const toggleAmbience = () => {
    const enabled = !isAmbienceEnabled;
    setIsAmbienceEnabled(enabled);
    saveAmbienceEnabled(browserStorage(), enabled);
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

  // 状態の移り変わりから出来事を読み取り、効果音・店主の表情・丼を下げる演出・平らげた値段を出す
  useEffect(() => {
    const previous = previousStateRef.current;
    previousStateRef.current = state;
    if (previous === state) return;
    const events = detectGameEvents(previous, state);
    // スペースか Enter で実際にプレイが始まったときに、1 回だけ計測する
    if (previous.status !== "playing" && state.status === "playing") {
      trackPlayStart(state.course, state.toppings);
      ambience.startPlay(state.course.timeLimitMs / 1000);
    }
    if (
      (state.status === "playing" || state.status === "waiting") &&
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
      setPricePop(null);
      return;
    }
    const pop = servedPricePopOf(previous, state);
    if (pop !== null) setPricePop(pop);
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
      // のびきって下げる丼は、それまでに食べ進めた分の麺を減らしたまま下げる
      eatenRatio: reason === "eaten" ? 1 : eatenRatio(previous.typing),
    });
  }, [state, isSoundEnabled, playSound, ambience]);

  const onStage = (screen: ReactNode) => (
    <GameStage
      corner={
        // 札の高さは 1 枚のときと変えないよう、横に並べる
        <div className="flex gap-[0.8cqw]">
          <SoundToggle
            label="効果音"
            enabled={isSoundEnabled}
            onToggle={toggleSound}
          />
          <SoundToggle
            label="環境音・BGM"
            enabled={isAmbienceEnabled}
            onToggle={toggleAmbience}
          />
        </div>
      }
    >
      {/* 画面の入れ物。レイアウトに関わらないよう contents にし、切り替えのあとのフォーカス先を探すのに使う */}
      <div ref={sceneRef} className="contents">
        {screen}
      </div>
      {sceneTransition && (
        <SceneTransitionOverlay
          key={sceneTransition.id}
          kind={sceneTransition.kind}
          isLightsDimming={closingPlay !== null}
        />
      )}
      {/* 画面が替わったことを、スクリーンリーダーに知らせる */}
      <p
        data-testid="scene-announcement"
        aria-live="polite"
        className="sr-only"
      >
        {/* 灯りが落ちるあいだはまだ伝票が出ていないので、結果画面が出てから知らせる */}
        {closingPlay === null ? sceneAnnouncement : ""}
      </p>
    </GameStage>
  );

  const renderPlay = (playState: PlayingState) =>
    onStage(
      <RamenPlay
        state={playState}
        bowlId={bowlIdOf(playState.stats)}
        leavingBowl={leavingBowl}
        onLeavingBowlEnd={() => setLeavingBowl(null)}
        pricePop={pricePop}
        shopkeeperMood={shopkeeperMood}
      />,
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
      // 動きを抑える設定では判子が最初から押されているので、待たずに鳴らす。
      // 結果画面は灯りが落ちてから出るので、判子が着く時刻もその分遅らせる
      const isReducedMotion = prefersReducedMotion();
      const stampSeconds = isReducedMotion
        ? 0
        : resultSceneDelaySeconds(isReducedMotion) + STAMP_LANDING_SECONDS;
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

  // 始めるのを待っているあいだは、スペースか Enter でだけ始める。ほかのキーはミスにもしない
  useEffect(() => {
    if (!isWaiting) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      // Alt+← で戻るなど、ブラウザのショートカットは止めない（プレイ中と同じ）
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (isPageScrollKey(event.key)) event.preventDefault();
      const action = waitingKeyAction(event);
      if (action === "ime") {
        dispatch({ type: "ime" });
        return;
      }
      if (action !== "open") return;
      // 始めるために押した Enter で、フォーカスのあるボタンまで押されないようにする
      event.preventDefault();
      setTicketCourse(null);
      // 食券を使ってプレイを始めたので、このあとページを離れても途中でやめたとはみなさない
      ticketCourseRef.current = null;
      dispatch({ type: "open", now: Date.now(), roll: Math.random() });
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isWaiting]);

  // 食券はプレイが始まるまで持たせておき、始めるのを待つ間にページを離れても、やめたとみなす
  const prepare = (course: Course, toppings: readonly ToppingId[]) => {
    isImeNoticeTrackedRef.current = false;
    dispatch({
      type: "prepare",
      course,
      toppings,
      orders: shuffleOrders(ordersForCourse(orders, course)),
    });
  };

  if (state.status === "ready" && ticketCourse !== null) {
    return onStage(
      <ToppingSelect
        course={ticketCourse}
        onStart={(toppings) => prepare(ticketCourse, toppings)}
      />,
    );
  }

  if (state.status === "waiting") {
    return onStage(<RamenWaiting state={state} />);
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

  // 閉店しても、灯りが落ちるあいだは止めたプレイの画面を見せる。時間は閉店した時点で止まり、キーも数えない
  if (closingPlay !== null) {
    return renderPlay(closingPlay);
  }

  if (state.status === "closed") {
    // 伝票の画面は看板も絵の中に置くので、舞台いっぱいに描く
    return onStage(
      <RamenResult
        course={state.course}
        toppings={state.toppings}
        result={summarizePlay(state.stats, state.playedMs)}
        personalBest={personalBest}
        onRevealSkip={(elapsedSeconds) => {
          // 判子が着く前に演出を飛ばしたら、予約した判子と自己ベストの音を取り消し、いま押された判子に合わせて鳴らし直す。
          // 取り消しは鳴っている音も止めるので、判子が着いたあと（判子の音が鳴っている）なら何もしない
          if (!isSoundEnabled || elapsedSeconds >= STAMP_LANDING_SECONDS) {
            return;
          }
          stopSounds();
          playSound("stamp");
          if (personalBest?.isUpdated) {
            playSound("personalBest", PERSONAL_BEST_AFTER_STAMP_SECONDS);
          }
        }}
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

  return renderPlay(state);
}
