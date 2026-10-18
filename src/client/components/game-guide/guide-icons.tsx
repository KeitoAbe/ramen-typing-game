import type { ReactNode } from "react";

/**
 * 遊び方の手順に添える小さな絵（券売機・キー・丼・伝票）。
 * 屋台の絵と同じく、生成りの線で描く。読み上げには手順の文章があるので、絵は読ませない
 */
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-full"
    >
      {children}
    </svg>
  );
}

/** 券売機と、取出口から出てくる食券 */
export function TicketMachineIcon() {
  return (
    <Icon>
      <rect x="9" y="5" width="22" height="24" rx="2" />
      <path d="M13 10h14M13 15h14M13 20h6" />
      <path d="M14 29v6h12v-6" />
    </Icon>
  );
}

/** キーボードのキーに置いた「R」（ローマ字） */
export function KeyIcon() {
  return (
    <Icon>
      <rect x="7" y="8" width="26" height="24" rx="4" />
      <path d="M7 26h26" />
      <path d="M16 21v-9h4.5a2.75 2.75 0 0 1 0 5.5H16M20 17.5l4 3.5" />
    </Icon>
  );
}

/** 湯気の立つ丼と箸 */
export function BowlIcon() {
  return (
    <Icon>
      <path d="M6 20h28a14 11 0 0 1-28 0Z" />
      <path d="M15 33h10" />
      <path d="M15 15c-1.5-2 1.5-3.5 0-6M21 15c-1.5-2 1.5-3.5 0-6" />
      <path d="M26 17l9-10M29 18l7-8" />
    </Icon>
  );
}

/** お会計の伝票 */
export function ReceiptIcon() {
  return (
    <Icon>
      <path d="M10 5h20v30l-3.5-2.5L23 35l-3-2.5-3 2.5-3.5-2.5L10 35Z" />
      <path d="M15 12h10M15 18h10M15 24h6" />
    </Icon>
  );
}
