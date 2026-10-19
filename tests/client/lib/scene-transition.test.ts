import {
  type GameScene,
  LIGHTS_OUT_SECONDS,
  RECEIPT_HAND_OVER_SECONDS,
  resultSceneDelaySeconds,
  type SceneTransitionKind,
  sceneAnnouncementOf,
  sceneOf,
  sceneTransitionOf,
  sceneTransitionSeconds,
} from "@/client/lib/scene-transition";

const KINDS: SceneTransitionKind[] = ["lights-out", "back-to-machine"];

describe("sceneOf", () => {
  it("券売機の前では、食券を持っていなければ券売機、持っていればトッピングの画面にする", () => {
    expect(sceneOf("ready", false)).toBe("ticket");
    expect(sceneOf("ready", true)).toBe("topping");
  });

  it("開始待ち・プレイ中・閉店後は、それぞれの画面にする", () => {
    expect(sceneOf("waiting", false)).toBe("waiting");
    expect(sceneOf("playing", false)).toBe("playing");
    expect(sceneOf("closed", false)).toBe("result");
  });
});

describe("sceneTransitionOf", () => {
  it.each<[GameScene, GameScene, SceneTransitionKind]>([
    ["playing", "result", "lights-out"],
    ["result", "ticket", "back-to-machine"],
  ])("%s から %s へは %s で移る", (from, to, kind) => {
    expect(sceneTransitionOf(from, to)).toBe(kind);
  });

  it("券売機からトッピングへは、食券が出てきたらそのまま切り替わるよう移り変わりを付けない", () => {
    expect(sceneTransitionOf("ticket", "topping")).toBeNull();
  });

  it("トッピングから開始待ちへは、その場で切り替わるよう移り変わりを付けない", () => {
    expect(sceneTransitionOf("topping", "waiting")).toBeNull();
  });

  it("開始待ちからプレイへは、すぐに始まるよう移り変わりを付けない", () => {
    expect(sceneTransitionOf("waiting", "playing")).toBeNull();
  });
});

describe("sceneTransitionSeconds", () => {
  it.each(KINDS)("%s は 0.6 秒以内に終わる", (kind) => {
    expect(sceneTransitionSeconds(kind, false)).toBeGreaterThan(0);
    expect(sceneTransitionSeconds(kind, false)).toBeLessThanOrEqual(0.6);
  });

  it("閉店は、灯りが落ちる長さと伝票が差し出される長さを足した秒で終わる", () => {
    expect(sceneTransitionSeconds("lights-out", false)).toBeCloseTo(
      LIGHTS_OUT_SECONDS + RECEIPT_HAND_OVER_SECONDS,
    );
  });

  it.each(
    KINDS,
  )("動きを抑える設定では、%s も 0.6 秒以内の短い移り変わりにする", (kind) => {
    expect(sceneTransitionSeconds(kind, true)).toBeLessThanOrEqual(0.6);
  });
});

describe("resultSceneDelaySeconds", () => {
  it("灯りが落ちる長さだけ遅れて結果画面を出す", () => {
    expect(resultSceneDelaySeconds(false)).toBe(LIGHTS_OUT_SECONDS);
  });

  it("動きを抑える設定では、待たずに結果画面を出す", () => {
    expect(resultSceneDelaySeconds(true)).toBe(0);
  });
});

describe("sceneAnnouncementOf", () => {
  it("画面ごとに違う文で知らせる", () => {
    const scenes: GameScene[] = [
      "ticket",
      "topping",
      "waiting",
      "playing",
      "result",
    ];
    const texts = scenes.map(sceneAnnouncementOf);
    expect(new Set(texts).size).toBe(scenes.length);
    for (const text of texts) expect(text).not.toBe("");
  });
});
