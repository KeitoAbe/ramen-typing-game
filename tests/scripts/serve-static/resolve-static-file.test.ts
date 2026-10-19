import {
  contentTypeOf,
  isInsideRoot,
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
    expect(staticFileCandidates("/%5C..%5CREADME.md")).toEqual([]);
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

  it("拡張子の無い画像のルートは PNG として返す", () => {
    expect(contentTypeOf("/srv/out/opengraph-image")).toBe("image/png");
    expect(contentTypeOf("twitter-image")).toBe("image/png");
    expect(contentTypeOf("apple-icon")).toBe("image/png");
  });

  it("それ以外の拡張子が無いファイルはバイナリとして返す", () => {
    expect(contentTypeOf("unknown")).toBe("application/octet-stream");
  });
});

describe("isInsideRoot", () => {
  it("出力ディレクトリの中のファイルは true を返す", () => {
    expect(isInsideRoot("/srv/out", "/srv/out/about.html")).toBe(true);
    expect(isInsideRoot("/srv/out", "/srv/out/_next/a.js")).toBe(true);
  });

  it("出力ディレクトリそのものや、外を指すパスは false を返す", () => {
    expect(isInsideRoot("/srv/out", "/srv/out")).toBe(false);
    expect(isInsideRoot("/srv/out", "/srv/README.md")).toBe(false);
    expect(isInsideRoot("/srv/out", "/srv/out-secret/a.txt")).toBe(false);
  });
});
