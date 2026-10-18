import { renderToStaticMarkup } from "react-dom/server";
import { AdsenseScript } from "@/client/components/adsense/adsense-script";
import { GuideAd } from "@/client/components/adsense/guide-ad";
import { StageBottomAd } from "@/client/components/adsense/stage-bottom-ad";
import {
  StageSideAd,
  stageSideAdIds,
} from "@/client/components/adsense/stage-side-ad";

const PUBLISHER_ID = "ca-pub-1234567890123456";
const SLOT_ID = "9876543210";

const ENV_NAMES = [
  "NEXT_PUBLIC_ADSENSE_PUBLISHER_ID",
  "NEXT_PUBLIC_ADSENSE_SLOT_ID",
  "NEXT_PUBLIC_ADSENSE_STAGE_BOTTOM_SLOT_ID",
  "NEXT_PUBLIC_ADSENSE_STAGE_SIDE_SLOT_ID",
];
const original = Object.fromEntries(
  ENV_NAMES.map((name) => [name, process.env[name]]),
);

function setEnv(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

afterEach(() => {
  for (const name of ENV_NAMES) setEnv(name, original[name]);
});

describe("AdsenseScript", () => {
  it("パブリッシャー ID があるときは、async でアドセンスのスクリプトを読み込む", () => {
    setEnv("NEXT_PUBLIC_ADSENSE_PUBLISHER_ID", PUBLISHER_ID);
    const html = renderToStaticMarkup(<AdsenseScript />);
    expect(html).toContain(
      `src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${PUBLISHER_ID}"`,
    );
    expect(html).toContain("async");
    expect(html).toContain('crossorigin="anonymous"');
  });

  it("パブリッシャー ID が無いときは何も出さない", () => {
    setEnv("NEXT_PUBLIC_ADSENSE_PUBLISHER_ID", undefined);
    expect(renderToStaticMarkup(<AdsenseScript />)).toBe("");
  });
});

describe("GuideAd", () => {
  it("両方の ID があるときは、高さを確保した広告枠を出す", () => {
    setEnv("NEXT_PUBLIC_ADSENSE_PUBLISHER_ID", PUBLISHER_ID);
    setEnv("NEXT_PUBLIC_ADSENSE_SLOT_ID", SLOT_ID);
    const html = renderToStaticMarkup(<GuideAd />);
    expect(html).toContain('class="adsbygoogle"');
    expect(html).toContain(`data-ad-client="${PUBLISHER_ID}"`);
    expect(html).toContain(`data-ad-slot="${SLOT_ID}"`);
    expect(html).toContain("height:280px");
  });

  it("広告ユニットの ID が無いときは枠を出さない", () => {
    setEnv("NEXT_PUBLIC_ADSENSE_PUBLISHER_ID", PUBLISHER_ID);
    setEnv("NEXT_PUBLIC_ADSENSE_SLOT_ID", undefined);
    expect(renderToStaticMarkup(<GuideAd />)).toBe("");
  });

  it("パブリッシャー ID が無いときは枠を出さない", () => {
    setEnv("NEXT_PUBLIC_ADSENSE_PUBLISHER_ID", undefined);
    setEnv("NEXT_PUBLIC_ADSENSE_SLOT_ID", SLOT_ID);
    expect(renderToStaticMarkup(<GuideAd />)).toBe("");
  });
});

describe.each([
  {
    name: "StageBottomAd",
    Ad: StageBottomAd,
    slotEnv: "NEXT_PUBLIC_ADSENSE_STAGE_BOTTOM_SLOT_ID",
    height: 90,
  },
  {
    name: "StageSideAd",
    Ad: StageSideAd,
    slotEnv: "NEXT_PUBLIC_ADSENSE_STAGE_SIDE_SLOT_ID",
    height: 600,
  },
])("$name", ({ Ad, slotEnv, height }) => {
  it("両方の ID があるときは、高さを確保した広告枠を出す", () => {
    setEnv("NEXT_PUBLIC_ADSENSE_PUBLISHER_ID", PUBLISHER_ID);
    setEnv(slotEnv, SLOT_ID);
    const html = renderToStaticMarkup(<Ad />);
    expect(html).toContain('class="adsbygoogle"');
    expect(html).toContain(`data-ad-client="${PUBLISHER_ID}"`);
    expect(html).toContain(`data-ad-slot="${SLOT_ID}"`);
    expect(html).toContain(`height:${height}px`);
  });

  it("紹介の後ろの枠の ID だけでは出さない（枠ごとに別の ID を使う）", () => {
    setEnv("NEXT_PUBLIC_ADSENSE_PUBLISHER_ID", PUBLISHER_ID);
    setEnv("NEXT_PUBLIC_ADSENSE_SLOT_ID", SLOT_ID);
    setEnv(slotEnv, undefined);
    expect(renderToStaticMarkup(<Ad />)).toBe("");
  });

  it("パブリッシャー ID が無いときは枠を出さない", () => {
    setEnv("NEXT_PUBLIC_ADSENSE_PUBLISHER_ID", undefined);
    setEnv(slotEnv, SLOT_ID);
    expect(renderToStaticMarkup(<Ad />)).toBe("");
  });
});

describe("stageSideAdIds", () => {
  it("パブリッシャー ID と右の枠の ID がそろったときだけ返す", () => {
    setEnv("NEXT_PUBLIC_ADSENSE_PUBLISHER_ID", PUBLISHER_ID);
    setEnv("NEXT_PUBLIC_ADSENSE_STAGE_SIDE_SLOT_ID", SLOT_ID);
    expect(stageSideAdIds()).toEqual({
      publisherId: PUBLISHER_ID,
      slotId: SLOT_ID,
    });

    setEnv("NEXT_PUBLIC_ADSENSE_STAGE_SIDE_SLOT_ID", undefined);
    expect(stageSideAdIds()).toBeNull();

    setEnv("NEXT_PUBLIC_ADSENSE_PUBLISHER_ID", undefined);
    setEnv("NEXT_PUBLIC_ADSENSE_STAGE_SIDE_SLOT_ID", SLOT_ID);
    expect(stageSideAdIds()).toBeNull();
  });
});
