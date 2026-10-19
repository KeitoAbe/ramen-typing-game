import type { Metadata, ResolvingMetadata } from "next";
import Link from "next/link";
import { pageMetadata, pageTitle, SITE_NAME } from "@/app/site-metadata";
import { ExternalLink } from "@/client/components/external-link/external-link";
import {
  LegalPage,
  LegalSection,
} from "@/client/components/legal-page/legal-page";
import { CONTRIBUTING_URL, REPOSITORY_URL } from "@/client/lib/repository";

export function generateMetadata(
  _props: unknown,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  return pageMetadata(
    {
      title: pageTitle("運営者情報"),
      description: `タイピングゲーム「${SITE_NAME}」の運営者情報です。個人で開発・運営しています。`,
      path: "/about",
    },
    parent,
  );
}

export default function AboutPage() {
  return (
    <LegalPage siteName={SITE_NAME} title="運営者情報">
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-[auto_1fr]">
        <dt className="font-bold text-yatai-kinari/75">サイト名</dt>
        <dd>{SITE_NAME}</dd>
        <dt className="font-bold text-yatai-kinari/75">運営者</dt>
        <dd>阿部 圭杜</dd>
        <dt className="font-bold text-yatai-kinari/75">運営形態</dt>
        <dd>個人で開発・運営しています</dd>
      </dl>
      <LegalSection title="お問い合わせ">
        <p>
          ご意見やご質問は、
          <Link
            href="/contact"
            className="underline underline-offset-4 hover:text-yatai-amber"
          >
            お問い合わせ
          </Link>
          のページからお送りください。
        </p>
      </LegalSection>
      <LegalSection title="開発に参加する">
        <p>
          このゲームはオープンソース（MIT ライセンス）で、ソースコードを
          <ExternalLink href={REPOSITORY_URL}>GitHub のリポジトリ</ExternalLink>
          で公開しています。どなたでも、GitHub
          で不具合の報告（Issue）や改善の提案（PR）を出せます。
        </p>
        <p>いただいた報告や提案を取り込むかどうかは、運営者が判断します。</p>
        <p>
          サイトの広告収益は運営者に帰属します。開発への貢献に対する報酬や、収益の分配はありません。
        </p>
        <p>
          参加の仕方は、
          <ExternalLink href={CONTRIBUTING_URL}>
            参加のしかた（CONTRIBUTING.md）
          </ExternalLink>
          にまとめています。
        </p>
      </LegalSection>
    </LegalPage>
  );
}
