import { renderToStaticMarkup } from "react-dom/server";
import { AdsenseScript } from "@/client/components/adsense/adsense-script";
import { GuideAd } from "@/client/components/adsense/guide-ad";

const PUBLISHER_ID = "ca-pub-1234567890123456";
const SLOT_ID = "9876543210";

const original = {
  publisherId: process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID,
  slotId: process.env.NEXT_PUBLIC_ADSENSE_SLOT_ID,
};

function setEnv(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

afterEach(() => {
  setEnv("NEXT_PUBLIC_ADSENSE_PUBLISHER_ID", original.publisherId);
  setEnv("NEXT_PUBLIC_ADSENSE_SLOT_ID", original.slotId);
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
