import Link from "next/link";
import type { ReactNode } from "react";
import { SiteFooter } from "@/client/components/site-footer/site-footer";

/** プライバシーポリシーなど、運営まわりのページの共通の枠。h1 とトップページへ戻るリンクを持つ */
export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <>
      <main className="flex w-full flex-1 flex-col">
        <article className="mx-auto w-full max-w-3xl px-5 py-12 text-base leading-relaxed wrap-break-word sm:px-8 sm:py-16">
          <Link
            href="/"
            className="text-sm text-yatai-amber underline underline-offset-4 hover:text-yatai-kinari"
          >
            ← ラーメン屋台タイピングに戻る
          </Link>
          <h1 className="mt-6 border-b-2 border-yatai-wood pb-3 font-display text-2xl leading-snug text-yatai-kinari sm:text-3xl">
            {title}
          </h1>
          <div className="mt-8 space-y-4">{children}</div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}

/** 運営まわりのページの節。見出しは h2 */
export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="font-display text-lg leading-snug text-yatai-amber sm:text-xl">
        {title}
      </h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

/** 外部のサイトを新しいタブで開くリンク */
export function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="break-all text-yatai-amber underline underline-offset-4 hover:text-yatai-kinari"
    >
      {children}
      <span className="sr-only">（新しいタブで開きます）</span>
    </a>
  );
}
