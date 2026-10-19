import type { Metadata } from "next";
import {
  Dela_Gothic_One,
  Geist_Mono,
  Zen_Kaku_Gothic_New,
} from "next/font/google";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE } from "@/app/site-metadata";
import { getSiteUrl } from "@/app/site-url";
import { AdsenseScript } from "@/client/components/adsense/adsense-script";
import { GoogleAnalytics } from "@/client/components/google-analytics/google-analytics";
import { parseGaMeasurementId } from "@/client/lib/analytics";
import "./globals.css";

// 日本語の書体は subsets に日本語がなく、先読みすると重いので preload しない
const delaGothicOne = Dela_Gothic_One({
  variable: "--font-dela-gothic-one",
  weight: "400",
  preload: false,
});

const zenKakuGothicNew = Zen_Kaku_Gothic_New({
  variable: "--font-zen-kaku-gothic-new",
  weight: ["400", "700"],
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// OGP 画像は opengraph-image.tsx / twitter-image.tsx から自動で入る。
// 基準 URL（metadataBase）は NEXT_PUBLIC_SITE_URL から取る。正規 URL は各ページで設定する
export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ja"
      className={`${delaGothicOne.variable} ${zenKakuGothicNew.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <AdsenseScript />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        {/* NEXT_PUBLIC_ の値はビルド時に埋め込まれる（static export で静的ファイルとして配信するため） */}
        <GoogleAnalytics
          measurementId={parseGaMeasurementId(
            process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
          )}
        />
      </body>
    </html>
  );
}
