import {
  fillKaedamaGauge,
  KAEDAMA_GAUGE_MAX,
} from "@/client/lib/ramen-kaedama";

describe("fillKaedamaGauge", () => {
  it("正しく打つたびにゲージが 1 ずつたまる", () => {
    expect(fillKaedamaGauge(0)).toEqual({ gauge: 1, refilled: false });
    expect(fillKaedamaGauge(KAEDAMA_GAUGE_MAX - 2)).toEqual({
      gauge: KAEDAMA_GAUGE_MAX - 1,
      refilled: false,
    });
  });

  it("満タンになると替え玉になり、ゲージは 0 から再開する", () => {
    expect(fillKaedamaGauge(KAEDAMA_GAUGE_MAX - 1)).toEqual({
      gauge: 0,
      refilled: true,
    });
  });
});
