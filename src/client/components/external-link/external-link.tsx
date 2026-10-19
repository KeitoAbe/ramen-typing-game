import type { ReactNode } from "react";

/** 外部のサイトを新しいタブで開くリンク */
export function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="break-all underline underline-offset-4 hover:text-yatai-amber"
    >
      {children}
      <span className="sr-only">（新しいタブで開きます）</span>
    </a>
  );
}
