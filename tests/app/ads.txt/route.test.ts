import { GET } from "@/app/ads.txt/route";

describe("/ads.txt", () => {
  const original = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID;
  afterEach(() => {
    if (original === undefined)
      delete process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID;
    else process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID = original;
  });

  it("パブリッシャー ID があるときは、Google の 1 行をテキストで返す", async () => {
    process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID = "ca-pub-1234567890123456";
    const response = GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/plain");
    expect(await response.text()).toBe(
      "google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n",
    );
  });

  it("パブリッシャー ID が無いときは、static export でファイルを書き出させない 410 を返す", () => {
    delete process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID;
    expect(GET().status).toBe(410);
  });
});
