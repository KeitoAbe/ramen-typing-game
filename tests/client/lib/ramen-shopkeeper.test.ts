import { shopkeeperMoodOf } from "@/client/lib/ramen-shopkeeper";

describe("shopkeeperMoodOf", () => {
  it("平らげたら笑顔", () => {
    expect(shopkeeperMoodOf(["served"])).toBe("happy");
    expect(shopkeeperMoodOf(["served", "kaedama"])).toBe("happy");
  });

  it("打ち間違えたら眉が下がる", () => {
    expect(shopkeeperMoodOf(["miss"])).toBe("troubled");
  });

  it("のびきって下げられたら眉が下がる", () => {
    expect(shopkeeperMoodOf(["discarded"])).toBe("troubled");
  });

  it("下げた直後に平らげたときは笑顔を優先する", () => {
    expect(shopkeeperMoodOf(["discarded", "served"])).toBe("happy");
  });

  it("表情を変えない出来事だけなら null", () => {
    expect(shopkeeperMoodOf([])).toBeNull();
    expect(shopkeeperMoodOf(["correct"])).toBeNull();
    expect(shopkeeperMoodOf(["closed"])).toBeNull();
  });
});
