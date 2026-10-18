import Link from "next/link";

const FOOTER_LINKS = [
  { href: "/privacy", label: "プライバシーポリシー" },
  { href: "/about", label: "運営者情報" },
  { href: "/contact", label: "お問い合わせ" },
] as const;

/** ページの最下部に置く、運営まわりのページへのリンク。屋台の台（木の板）に見立てる */
export function SiteFooter() {
  return (
    <footer className="w-full bg-yatai-wood-dark py-8 text-sm shadow-[inset_0_2px_0_rgb(255_255_255/0.12)]">
      <nav aria-label="サイトの情報" className="page-column">
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          {FOOTER_LINKS.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className="text-yatai-kinari underline underline-offset-4 hover:text-yatai-amber"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </footer>
  );
}
