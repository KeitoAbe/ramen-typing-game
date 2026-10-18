import {
  contactMailtoHref,
  decodeContactEmail,
  encodeContactEmail,
  parseContactEmail,
} from "@/client/lib/contact-email";

describe("parseContactEmail", () => {
  it("メールアドレスの形なら、前後の空白を除いて返す", () => {
    expect(parseContactEmail("contact@example.com")).toBe(
      "contact@example.com",
    );
    expect(parseContactEmail("  contact@example.com  ")).toBe(
      "contact@example.com",
    );
  });

  it("未設定・空のときは null を返す", () => {
    expect(parseContactEmail(undefined)).toBeNull();
    expect(parseContactEmail("")).toBeNull();
    expect(parseContactEmail("   ")).toBeNull();
  });

  it("メールアドレスの形でないときは null を返す", () => {
    expect(parseContactEmail("contact")).toBeNull();
    expect(parseContactEmail("contact@example")).toBeNull();
    expect(parseContactEmail("@example.com")).toBeNull();
    expect(parseContactEmail("con tact@example.com")).toBeNull();
    expect(parseContactEmail("https://forms.gle/abc")).toBeNull();
  });

  it("連続したドットや空のラベルを含むときは null を返す", () => {
    expect(parseContactEmail("contact@example..com")).toBeNull();
    expect(parseContactEmail("contact@.example.com")).toBeNull();
    expect(parseContactEmail("con..tact@example.com")).toBeNull();
    expect(parseContactEmail(".contact@example.com")).toBeNull();
  });

  it("エンコードできない文字や mailto: で予約された文字を含むときは null を返す", () => {
    expect(parseContactEmail("info@例え.テスト")).toBeNull();
    expect(parseContactEmail("help?desk@example.com")).toBeNull();
    expect(parseContactEmail("a#b@example.com")).toBeNull();
    expect(parseContactEmail("a&b@example.com")).toBeNull();
    expect(parseContactEmail("a%b@example.com")).toBeNull();
  });

  it("よく使われる記号を含むアドレスは受け付ける", () => {
    expect(parseContactEmail("first.last+tag@mail.example.co.jp")).toBe(
      "first.last+tag@mail.example.co.jp",
    );
  });
});

describe("encodeContactEmail / decodeContactEmail", () => {
  it("変えた値にはアドレスがそのまま含まれず、戻すと元のアドレスになる", () => {
    const encoded = encodeContactEmail("contact@example.com");
    expect(encoded).not.toContain("contact@example.com");
    expect(encoded).not.toContain("@");
    expect(decodeContactEmail(encoded)).toBe("contact@example.com");
  });

  it("戻せない値やメールアドレスにならない値は null を返す", () => {
    expect(decodeContactEmail("%%%")).toBeNull();
    expect(decodeContactEmail(btoa("not-an-email"))).toBeNull();
  });
});

describe("contactMailtoHref", () => {
  it("宛先と、エンコードした件名が入った mailto: の URL を返す", () => {
    const href = contactMailtoHref("contact@example.com");
    expect(href.startsWith("mailto:contact@example.com?subject=")).toBe(true);
    expect(decodeURIComponent(href.split("subject=")[1])).toBe(
      "ラーメン屋台タイピングへのお問い合わせ",
    );
  });
});
