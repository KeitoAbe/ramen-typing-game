import {
  extractFontFileUrl,
  googleFontCssUrl,
} from "@/server/contexts/shared/infrastructure/fonts/google-font-css";

describe("googleFontCssUrl", () => {
  it("書体・太さ・使う文字をクエリに入れる", () => {
    const url = new URL(googleFontCssUrl("Dela Gothic One", 400, "屋台"));
    expect(url.origin + url.pathname).toBe("https://fonts.googleapis.com/css2");
    expect(url.searchParams.get("family")).toBe("Dela Gothic One:wght@400");
    expect(url.searchParams.get("text")).toBe("屋台");
  });
});

describe("extractFontFileUrl", () => {
  it("truetype のフォントの URL を取り出す", () => {
    const css = `@font-face {
  font-family: 'Dela Gothic One';
  font-style: normal;
  font-weight: 400;
  src: url(https://fonts.gstatic.com/l/font?kit=abc&skey=def&v=v19) format('truetype');
}`;
    expect(extractFontFileUrl(css)).toBe(
      "https://fonts.gstatic.com/l/font?kit=abc&skey=def&v=v19",
    );
  });

  it("opentype のフォントも取り出す", () => {
    const css = `src: url(https://fonts.gstatic.com/a.otf) format("opentype");`;
    expect(extractFontFileUrl(css)).toBe("https://fonts.gstatic.com/a.otf");
  });

  it("woff2 しかなければ null を返す", () => {
    const css = `src: url(https://fonts.gstatic.com/a.woff2) format('woff2');`;
    expect(extractFontFileUrl(css)).toBeNull();
  });
});
