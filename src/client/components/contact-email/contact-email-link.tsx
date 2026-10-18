"use client";

import { useEffect, useState } from "react";
import {
  contactMailtoHref,
  decodeContactEmail,
} from "@/client/lib/contact-email";

/**
 * お問い合わせ先のメールアドレスへのリンク。
 * サーバーから返る HTML にはアドレスを載せず、ブラウザで描画してから戻して表示する
 */
export function ContactEmailLink({ encodedEmail }: { encodedEmail: string }) {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    setEmail(decodeContactEmail(encodedEmail));
  }, [encodedEmail]);

  if (!email) {
    return <p>メールアドレスを表示しています…</p>;
  }
  return (
    <p>
      メールアドレス:{" "}
      <a
        href={contactMailtoHref(email)}
        className="break-all underline underline-offset-4 hover:text-yatai-amber"
      >
        {email}
      </a>
    </p>
  );
}
