import Link from "next/link";

type Props = {
  siteName: string;
  /**
   * サイト名をそろえる先。
   * stage: 舞台の左端（トップページ）
   * column: 本文の段の左端（運営まわりのページ）
   */
  align: "stage" | "column";
};

/**
 * ページの上に置く、屋台の軒（木の梁）と、その下にかかるのれんの帯。サイト名を出す。
 * ページの見出し（h1）は本文に置くので、ここは見出しにしない
 */
export function SiteHeader({ siteName, align }: Props) {
  return (
    <header className="w-full">
      <div className="bg-yatai-wood-dark shadow-[inset_0_2px_0_rgb(255_255_255/0.12)]">
        {align === "stage" ? (
          // 舞台の段（src/app/page.tsx）と同じ並びにして、サイト名を舞台の左端にそろえる
          <div className="flex w-full justify-center px-5 min-[1000px]:px-0">
            <div className="w-full min-w-0 max-w-[960px] py-2">
              <SiteLogo siteName={siteName} />
            </div>
          </div>
        ) : (
          <div className="page-column py-2">
            <SiteLogo siteName={siteName} />
          </div>
        )}
      </div>
      {/* のれん: 提灯の赤の布に、一定の間隔で切れ目を入れる */}
      <div aria-hidden="true" className="noren-fringe h-2.5 w-full" />
    </header>
  );
}

function SiteLogo({ siteName }: { siteName: string }) {
  return (
    <Link
      href="/"
      className="font-display text-lg leading-tight tracking-widest text-yatai-kinari hover:text-yatai-amber"
    >
      {siteName}
    </Link>
  );
}
