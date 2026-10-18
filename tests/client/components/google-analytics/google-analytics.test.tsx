import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GoogleAnalytics } from "@/client/components/google-analytics/google-analytics";

// next/script はブラウザでスクリプトを差し込むので、渡した props を属性に写して確かめる
jest.mock("next/script", () => ({
  __esModule: true,
  default: ({
    id,
    src,
    strategy,
    children,
  }: {
    id: string;
    src?: string;
    strategy: string;
    children?: ReactNode;
  }) => (
    <script id={id} src={src} data-strategy={strategy}>
      {children}
    </script>
  ),
}));

describe("GoogleAnalytics", () => {
  it("測定 ID があるとき、その ID で GA4 のタグを読み込む", () => {
    const html = renderToStaticMarkup(
      <GoogleAnalytics measurementId="G-ABC123" />,
    );
    expect(html).toContain(
      'src="https://www.googletagmanager.com/gtag/js?id=G-ABC123"',
    );
    expect(html).toContain("gtag('config','G-ABC123')");
  });

  it("gtag.js 本体はブラウザが手すきになってから読み込む", () => {
    const html = renderToStaticMarkup(
      <GoogleAnalytics measurementId="G-ABC123" />,
    );
    expect(html).toMatch(/id="ga4-gtag"[^>]*data-strategy="lazyOnload"/);
  });

  it("測定 ID が無いときは、タグを一切出さない", () => {
    expect(renderToStaticMarkup(<GoogleAnalytics measurementId={null} />)).toBe(
      "",
    );
  });
});
