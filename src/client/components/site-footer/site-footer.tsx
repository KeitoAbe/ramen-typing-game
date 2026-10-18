import Link from "next/link";

const FOOTER_LINKS = [
  { href: "/privacy", label: "プライバシーポリシー" },
  { href: "/about", label: "運営者情報" },
  { href: "/contact", label: "お問い合わせ" },
] as const;

/** ページの最下部に置く、運営まわりのページへのリンク */
export function SiteFooter() {
  return (
    <footer className="w-full border-t-2 border-yatai-wood-dark bg-yatai-night px-5 py-8 text-sm sm:px-8">
      <nav aria-label="サイトの情報" className="mx-auto w-full max-w-3xl">
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
