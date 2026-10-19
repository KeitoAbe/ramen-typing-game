import type { Metadata } from "next";
import Link from "next/link";
import { pageTitle, SITE_NAME } from "@/app/site-metadata";
import { LegalPage } from "@/client/components/legal-page/legal-page";

// 存在しない URL には正規 URL を持たせない。noindex は Next.js が自動で付ける
export const metadata: Metadata = {
  title: pageTitle("ページが見つかりません"),
  description: `お探しのページは、${SITE_NAME}には見つかりませんでした。`,
};

export default function NotFound() {
  return (
    <LegalPage siteName={SITE_NAME} title="ページが見つかりません">
      <p>
        お探しのページは、移動したか削除された可能性があります。URL
        に打ち間違いがないかもご確認ください。
      </p>
      <p>
        <Link
          href="/"
          className="underline underline-offset-4 hover:text-yatai-amber"
        >
          トップページでゲームを遊ぶ
        </Link>
      </p>
    </LegalPage>
  );
}
