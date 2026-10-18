import type { Metadata } from "next";
import { pageTitle, SITE_NAME } from "@/app/site-metadata";
import {
  ExternalLink,
  LegalPage,
} from "@/client/components/legal-page/legal-page";
import { parseContactFormUrl } from "@/client/lib/contact-form-url";

export const metadata: Metadata = {
  title: pageTitle("お問い合わせ"),
  description: `タイピングゲーム「${SITE_NAME}」へのご意見・ご質問の窓口です。`,
};

export default function ContactPage() {
  // NEXT_PUBLIC_ の変数はビルド時に値が埋め込まれるので、実行時に環境変数が渡らないホスティングでも読める
  const formUrl = parseContactFormUrl(process.env.NEXT_PUBLIC_CONTACT_FORM_URL);
  return (
    <LegalPage title="お問い合わせ">
      <p>
        {SITE_NAME}
        へのご意見・ご質問・不具合のご報告は、Google
        フォームからお送りください。個人で運営しているため、お返事にお時間をいただくことや、お返事できないことがあります。
      </p>
      {formUrl ? (
        <p>
          <ExternalLink href={formUrl}>お問い合わせフォームを開く</ExternalLink>
        </p>
      ) : (
        <p className="font-bold text-yatai-amber">
          お問い合わせフォームは準備中です。
        </p>
      )}
    </LegalPage>
  );
}
