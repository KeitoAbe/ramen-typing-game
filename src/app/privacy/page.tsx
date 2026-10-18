import type { Metadata } from "next";
import Link from "next/link";
import { pageTitle, SITE_NAME } from "@/app/site-metadata";
import {
  ExternalLink,
  LegalPage,
  LegalSection,
} from "@/client/components/legal-page/legal-page";

export const metadata: Metadata = {
  title: pageTitle("プライバシーポリシー"),
  description: `タイピングゲーム「${SITE_NAME}」のプライバシーポリシーです。ブラウザに保存する情報、アクセス解析（Google アナリティクス）、広告配信（Google アドセンス）での Cookie の扱いを説明します。`,
  alternates: { canonical: "/privacy" },
};

const ESTABLISHED_ON = "2026 年 10 月 18 日";

export default function PrivacyPage() {
  return (
    <LegalPage siteName={SITE_NAME} title="プライバシーポリシー">
      <p>
        {SITE_NAME}
        （以下「当サイト」）での、利用者の情報の扱いについて説明します。
      </p>

      <LegalSection title="ブラウザに保存する情報">
        <p>
          当サイトは、コースごとの自己ベストと、効果音のオン・オフの設定を、遊んでいるブラウザの中（localStorage）に保存します。これらの情報はサーバーには送りません。
        </p>
        <p>
          保存した情報は、ブラウザのサイトデータを消すと削除できます。別のブラウザや端末には引き継がれません。
        </p>
      </LegalSection>

      <LegalSection title="アクセス解析ツールについて">
        <p>
          当サイトは、利用状況を把握するために、Google
          が提供するアクセス解析ツール「Google
          アナリティクス」を使います。Google アナリティクスは、Cookie
          を使って利用者の訪問の情報を集めます。Cookie
          に保存した識別子で、ブラウザや複数回の訪問を区別することがありますが、この識別子だけで個人を直接特定するものではありません。
        </p>
        <p>
          集めたデータは Google
          のプライバシーポリシーに従って管理されます。Google
          によるデータの扱いは、
          <ExternalLink href="https://policies.google.com/technologies/partner-sites?hl=ja">
            Google のサービスを使用するサイトやアプリから収集した情報の Google
            による使用
          </ExternalLink>
          をご覧ください。
        </p>
        <p>
          Google アナリティクスによる情報の収集は、
          <ExternalLink href="https://tools.google.com/dlpage/gaoptout?hl=ja">
            Google アナリティクス オプトアウト アドオン
          </ExternalLink>
          をブラウザに入れると止められます。ブラウザの設定で Cookie
          を無効にしても、Cookie
          を使わずにデータが送られる場合があるため、それだけでは収集が止まるとは限りません。
        </p>
      </LegalSection>

      <LegalSection title="広告の配信について">
        <p>
          当サイトは、第三者配信の広告サービス「Google
          アドセンス」を使います。Google などの第三者配信事業者は、Cookie
          を使って、利用者が当サイトや他のサイトを過去に訪れたときの情報にもとづいた広告を出します。
        </p>
        <p>
          Google が広告の Cookie を使うことで、Google
          やそのパートナーは、当サイトや他のサイトへの訪問の情報にもとづいて広告を出せます。詳しくは
          <ExternalLink href="https://policies.google.com/technologies/ads?hl=ja">
            Google の広告に関するポリシー
          </ExternalLink>
          をご覧ください。
        </p>
        <p>
          パーソナライズ広告は、
          <ExternalLink href="https://adssettings.google.com/">
            Google の広告設定
          </ExternalLink>
          で無効にできます。
        </p>
      </LegalSection>

      <LegalSection title="免責事項">
        <p>
          当サイトの内容は、できるかぎり正確になるよう努めていますが、正確さや安全性を保証するものではありません。当サイトを利用したことで生じた損害について、運営者は責任を負いかねます。
        </p>
        <p>
          当サイトからリンクしている他のサイトで提供される情報やサービスについても、責任を負いかねます。
        </p>
      </LegalSection>

      <LegalSection title="プライバシーポリシーの変更">
        <p>
          運営者は、必要に応じてこのプライバシーポリシーを変えることがあります。変えたあとのポリシーは、このページに載せた時点から効力を持ちます。
        </p>
        <p>
          ご質問は
          <Link
            href="/contact"
            className="underline underline-offset-4 hover:text-yatai-amber"
          >
            お問い合わせ
          </Link>
          のページからお送りください。
        </p>
      </LegalSection>

      <p className="mt-10 text-right text-sm text-yatai-kinari/75">
        制定日: {ESTABLISHED_ON}
      </p>
    </LegalPage>
  );
}
