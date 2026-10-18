import { parseContactFormUrl } from "@/client/lib/contact-form-url";

describe("parseContactFormUrl", () => {
  it("https の URL はそのまま返す", () => {
    expect(
      parseContactFormUrl("https://docs.google.com/forms/d/e/abc/viewform"),
    ).toBe("https://docs.google.com/forms/d/e/abc/viewform");
  });

  it("前後の空白は取り除く", () => {
    expect(parseContactFormUrl("  https://forms.gle/abc  ")).toBe(
      "https://forms.gle/abc",
    );
  });

  it("未設定や空文字のときは null を返す", () => {
    expect(parseContactFormUrl(undefined)).toBeNull();
    expect(parseContactFormUrl("")).toBeNull();
    expect(parseContactFormUrl("   ")).toBeNull();
  });

  it("URL として読めない値や http(s) 以外のときは null を返す", () => {
    expect(parseContactFormUrl("forms.gle/abc")).toBeNull();
    expect(parseContactFormUrl("javascript:alert(1)")).toBeNull();
  });
});
