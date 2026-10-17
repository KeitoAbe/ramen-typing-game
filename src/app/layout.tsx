import type { Metadata } from "next";
import { Dela_Gothic_One, Geist_Mono, Zen_Maru_Gothic } from "next/font/google";
import "./globals.css";

// 日本語の書体は subsets に日本語がなく、先読みすると重いので preload しない
const delaGothicOne = Dela_Gothic_One({
  variable: "--font-dela-gothic-one",
  weight: "400",
  preload: false,
});

const zenMaruGothic = Zen_Maru_Gothic({
  variable: "--font-zen-maru-gothic",
  weight: ["400", "700"],
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ラーメン屋台タイピング",
  description: "タイピングゲーム",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ja"
      className={`${delaGothicOne.variable} ${zenMaruGothic.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
