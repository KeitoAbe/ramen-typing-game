import {
  adsenseScriptSrc,
  buildAdsTxt,
  parseAdsensePublisherId,
  parseAdsenseSlotId,
} from "@/client/lib/adsense";

describe("parseAdsensePublisherId", () => {
  it("ca-pub- の形はそのまま返す", () => {
    expect(parseAdsensePublisherId("ca-pub-1234567890123456")).toBe(
      "ca-pub-1234567890123456",
    );
  });

  it("pub- の形や前後の空白は ca-pub- の形にそろえる", () => {
    expect(parseAdsensePublisherId("  pub-1234567890123456 ")).toBe(
      "ca-pub-1234567890123456",
    );
  });

  it("未設定や形が違う値のときは null を返す", () => {
    expect(parseAdsensePublisherId(undefined)).toBeNull();
    expect(parseAdsensePublisherId("")).toBeNull();
    expect(parseAdsensePublisherId("ca-pub-")).toBeNull();
    expect(parseAdsensePublisherId("ca-pub-12ab")).toBeNull();
    expect(parseAdsensePublisherId("ca-pub-1")).toBeNull();
    expect(parseAdsensePublisherId("ca-pub-12345678901234567")).toBeNull();
    expect(parseAdsensePublisherId("1234567890123456")).toBeNull();
  });
});

describe("parseAdsenseSlotId", () => {
  it("数字だけの値を返す", () => {
    expect(parseAdsenseSlotId(" 1234567890 ")).toBe("1234567890");
  });

  it("未設定や数字以外を含む値のときは null を返す", () => {
    expect(parseAdsenseSlotId(undefined)).toBeNull();
    expect(parseAdsenseSlotId("")).toBeNull();
    expect(parseAdsenseSlotId("12-34")).toBeNull();
  });
});

describe("adsenseScriptSrc", () => {
  it("パブリッシャー ID を client に付けた URL を返す", () => {
    expect(adsenseScriptSrc("ca-pub-1234567890123456")).toBe(
      "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1234567890123456",
    );
  });
});

describe("buildAdsTxt", () => {
  it("ca- を外した ID で、Google の 1 行を返す", () => {
    expect(buildAdsTxt("ca-pub-1234567890123456")).toBe(
      "google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n",
    );
  });
});
