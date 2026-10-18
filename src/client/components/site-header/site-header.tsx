import Link from "next/link";

type Props = {
  siteName: string;
};

/**
 * 舞台の上に置く細いヘッダー。サイト名を出す。
 * ページの見出し（h1）は舞台の下の紹介に置くので、ここは見出しにしない
 */
export function SiteHeader({ siteName }: Props) {
  return (
    <header className="w-full border-b-2 border-yatai-wood-dark bg-yatai-night px-5 py-2 sm:px-8">
      <div className="mx-auto w-full max-w-[960px]">
        <Link
          href="/"
          className="font-display text-lg leading-tight tracking-widest text-yatai-kinari hover:text-yatai-amber"
        >
          {siteName}
        </Link>
      </div>
    </header>
  );
}
