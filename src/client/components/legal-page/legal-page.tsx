import Link from "next/link";
import type { ReactNode } from "react";
import { SiteFooter } from "@/client/components/site-footer/site-footer";
import { SiteHeader } from "@/client/components/site-header/site-header";

/**
 * プライバシーポリシーなど、運営まわりのページの共通の枠。
 * トップページと同じヘッダー・フッターで挟み、h1 とトップページへ戻るリンクを持つ
 */
export function LegalPage({
  siteName,
  title,
  children,
}: {
  siteName: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <>
      <SiteHeader siteName={siteName} align="column" />
      <main className="flex w-full flex-1 flex-col">
        <article className="page-column py-12 text-base leading-body wrap-break-word sm:py-16">
          <Link
            href="/"
            className="text-sm underline underline-offset-4 hover:text-yatai-amber"
          >
            ← ラーメン屋台タイピングに戻る
          </Link>
          <h1 className="mt-6 font-display text-2xl leading-heading text-yatai-kinari sm:text-3xl">
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
      <h2 className="text-lg leading-heading font-bold sm:text-xl">{title}</h2>
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
      className="break-all underline underline-offset-4 hover:text-yatai-amber"
    >
      {children}
      <span className="sr-only">（新しいタブで開きます）</span>
    </a>
  );
}
