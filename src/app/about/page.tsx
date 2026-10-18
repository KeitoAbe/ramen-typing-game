import type { Metadata } from "next";
import Link from "next/link";
import { pageTitle, SITE_NAME } from "@/app/site-metadata";
import {
  LegalPage,
  LegalSection,
} from "@/client/components/legal-page/legal-page";

export const metadata: Metadata = {
  title: pageTitle("運営者情報"),
  description: `タイピングゲーム「${SITE_NAME}」の運営者情報です。個人で開発・運営しています。`,
};

export default function AboutPage() {
  return (
    <LegalPage title="運営者情報">
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-[auto_1fr]">
        <dt className="font-bold text-yatai-amber">サイト名</dt>
        <dd>{SITE_NAME}</dd>
        <dt className="font-bold text-yatai-amber">運営者</dt>
        <dd>阿部 圭杜</dd>
        <dt className="font-bold text-yatai-amber">運営形態</dt>
        <dd>個人で開発・運営しています</dd>
      </dl>
      <LegalSection title="お問い合わせ">
        <p>
          ご意見やご質問は、
          <Link
            href="/contact"
            className="text-yatai-amber underline underline-offset-4 hover:text-yatai-kinari"
          >
            お問い合わせ
          </Link>
          のページからお送りください。
        </p>
      </LegalSection>
    </LegalPage>
  );
}
