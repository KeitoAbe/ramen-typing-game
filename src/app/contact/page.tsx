import type { Metadata, ResolvingMetadata } from "next";
import { pageMetadata, pageTitle, SITE_NAME } from "@/app/site-metadata";
import { ContactEmailLink } from "@/client/components/contact-email/contact-email-link";
import { LegalPage } from "@/client/components/legal-page/legal-page";
import {
  encodeContactEmail,
  parseContactEmail,
} from "@/client/lib/contact-email";

export function generateMetadata(
  _props: unknown,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  return pageMetadata(
    {
      title: pageTitle("お問い合わせ"),
      description: `タイピングゲーム「${SITE_NAME}」へのご意見・ご質問の窓口です。`,
      path: "/contact",
    },
    parent,
  );
}

export default function ContactPage() {
  // NEXT_PUBLIC_ の変数はビルド時に値が埋め込まれるので、実行時に環境変数が渡らないホスティングでも読める
  const email = parseContactEmail(process.env.NEXT_PUBLIC_CONTACT_EMAIL);
  return (
    <LegalPage siteName={SITE_NAME} title="お問い合わせ">
      <p>
        {SITE_NAME}
        へのご意見・ご質問・不具合のご報告は、メールでお送りください。個人で運営しているため、お返事にお時間をいただくことや、お返事できないことがあります。
      </p>
      {email ? (
        <ContactEmailLink encodedEmail={encodeContactEmail(email)} />
      ) : (
        <p className="font-bold text-yatai-amber">
          お問い合わせの受け付けは準備中です。
        </p>
      )}
    </LegalPage>
  );
}
