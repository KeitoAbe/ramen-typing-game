import {
  contentTypeOf,
  staticFileCandidates,
} from "@scripts/serve-static/resolve-static-file";

describe("staticFileCandidates", () => {
  it("トップは index.html を返す", () => {
    expect(staticFileCandidates("/")).toEqual(["index.html"]);
  });

  it("拡張子なしの URL は、同名のファイル・.html・ディレクトリの index.html の順に探す", () => {
    expect(staticFileCandidates("/about")).toEqual([
      "about",
      "about.html",
      "about/index.html",
    ]);
  });

  it("末尾がスラッシュの URL は、ディレクトリの index.html・.html の順に探す", () => {
    expect(staticFileCandidates("/about/")).toEqual([
      "about/index.html",
      "about.html",
    ]);
  });

  it("拡張子のあるファイルは、そのまま探す", () => {
    expect(staticFileCandidates("/ads.txt")[0]).toBe("ads.txt");
    expect(staticFileCandidates("/_next/static/chunks/a.js")[0]).toBe(
      "_next/static/chunks/a.js",
    );
  });

  it("エンコードされたパスは戻してから探す", () => {
    expect(staticFileCandidates("/a%20b.txt")[0]).toBe("a b.txt");
  });

  it("出力ディレクトリの外を指すパスは探さない", () => {
    expect(staticFileCandidates("/../secret")).toEqual([]);
    expect(staticFileCandidates("/%2e%2e/secret")).toEqual([]);
  });

  it("読めないパスは探さない", () => {
    expect(staticFileCandidates("/%E0%A4%A")).toEqual([]);
  });
});

describe("contentTypeOf", () => {
  it("拡張子から Content-Type を決める", () => {
    expect(contentTypeOf("about.html")).toBe("text/html; charset=utf-8");
    expect(contentTypeOf("sitemap.xml")).toBe("application/xml; charset=utf-8");
    expect(contentTypeOf("icon.svg")).toBe("image/svg+xml");
  });

  it("拡張子が無いファイルはバイナリとして返す", () => {
    expect(contentTypeOf("opengraph-image")).toBe("application/octet-stream");
  });
});
