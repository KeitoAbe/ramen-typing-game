import type { ReactNode } from "react";
import {
  BowlIcon,
  KeyIcon,
  ReceiptIcon,
  TicketMachineIcon,
} from "@/client/components/game-guide/guide-icons";
import { FRESH_PRICE_RATE, MIN_PRICE_RATE } from "@/client/lib/ramen-bowl";
import { COURSES, type Course } from "@/client/lib/ramen-course";
import { describeCourse, describeStreakBonus } from "@/client/lib/ramen-guide";
import {
  KAEDAMA_EXTENSION_MS,
  KAEDAMA_GAUGE_MAX,
} from "@/client/lib/ramen-kaedama";
import { PRICE_PER_KANA } from "@/client/lib/ramen-result";
import {
  SPECIAL_BOWL_CHANCE,
  SPECIAL_BOWL_PRICE_RATE,
} from "@/client/lib/ramen-special-bowl";

/** コースごとの向き不向き。食券代や時間はゲームの設定から出す */
const COURSE_NOTES: Record<Course["id"], string> = {
  nami: "短い注文が出る、いちばん手軽なコース。",
  oomori: "少し長めの注文。並で元が取れたら腕試しに。",
  tokumori: "長い注文ばかり。称号「屋台の伝説」は特盛りだけ。",
};

type Faq = { question: string; answer: string };

const FAQS: readonly Faq[] = [
  {
    question: "キーを打っても文字が入らない",
    answer: "日本語入力がオンだと打てません。半角英数に切り替えてください。",
  },
  {
    question: "スマホやタブレットで遊べますか？",
    answer: "PC のキーボード向けで、スマホやタブレットでは遊べません。",
  },
  {
    question: "ローマ字のつづりは決まっていますか？",
    answer:
      "よく使うつづりなら打てます。「し」は shi・si・ci のどれでも OK です。",
  },
  {
    question: "自己ベストはどこに保存されますか？",
    answer:
      "遊んでいるブラウザに保存し、サーバーには送りません。別の端末には引き継がれません。",
  },
  {
    question: "効果音を消せますか？",
    answer: "右上の「効果音」の札で切り替えられます。",
  },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-14">
      <div className="flex items-center gap-3">
        {/* 見出しの目印。軒の梁の木口に見立てた小さな木の札 */}
        <span
          aria-hidden="true"
          className="h-5 w-2 shrink-0 rounded-sm bg-yatai-wood-light"
        />
        <h2 className="text-xl leading-heading font-bold sm:text-2xl">
          {title}
        </h2>
      </div>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

/** 遊び方の手順の 1 つ。左に絵、右に短い文。手順どうしは絵の下の点線でつなぐ */
function Step({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="group relative flex gap-4 pb-6 last:pb-0">
      <span
        aria-hidden="true"
        className="absolute top-14 bottom-1 left-6 border-l-2 border-dotted border-yatai-kinari/30 group-last:hidden"
      />
      <span className="size-12 shrink-0 rounded-full bg-yatai-wood-dark p-2.5 text-yatai-kinari shadow-[inset_0_2px_0_rgb(255_255_255/0.12)]">
        {icon}
      </span>
      <div className="min-w-0 pt-2.5">
        <p className="leading-heading font-bold">{title}</p>
        <p className="mt-1">{children}</p>
      </div>
    </li>
  );
}

/**
 * 舞台の下に置く、ゲームの紹介・遊び方・よくある質問。
 * 検索エンジンが読めるよう、サーバーで描いた HTML に文章を含める。
 * 数字はゲームの設定から出して、遊び方と仕組みが食い違わないようにする
 */
export function GameGuide() {
  const specialBowlInterval = Math.round(1 / SPECIAL_BOWL_CHANCE);
  return (
    <article className="page-column pt-12 pb-16 text-base leading-body wrap-break-word">
      <header>
        <h1 className="font-display text-2xl leading-heading text-yatai-kinari sm:text-3xl">
          ラーメン屋台タイピング
          <span className="mt-1 block font-sans text-base font-bold text-yatai-kinari/75 sm:text-lg">
            注文をローマ字で打って、ラーメンを平らげるタイピングゲーム
          </span>
        </h1>
      </header>

      <Section title="どんなゲーム？">
        <p>
          夜のラーメン屋台が舞台の、無料で遊べるタイピングゲームです。注文をローマ字で打ち切ると、一杯平らげたことになります。
        </p>
        <p>
          閉店までのお会計が食券代を上回れば「お得」、届かなければ「損」です。
        </p>
      </Section>

      <Section title="遊び方">
        {/* 遊びの流れ（券売機 → 打つ → 平らげる → 伝票）を 4 つの手順で見せる */}
        <ol>
          <Step icon={<TicketMachineIcon />} title="食券を買う。">
            並・大盛り・特盛りから選ぶと始まります。
          </Step>
          <Step icon={<KeyIcon />} title="注文をローマ字で打つ。">
            木札の注文を打ち切ると、次の丼が出ます。
          </Step>
          <Step icon={<BowlIcon />} title="麺がのびる前に食べる。">
            丼はよみ 1 文字 {PRICE_PER_KANA} 円で、できたてなら{" "}
            {FRESH_PRICE_RATE} 倍で売れます。のびるほど安くなり（最低{" "}
            {MIN_PRICE_RATE} 倍）、のびきると下げられます。
          </Step>
          <Step icon={<ReceiptIcon />} title="伝票で成績を見る。">
            閉店すると、損得や速さ、苦手なキー、称号が出ます。成績は X
            で共有できます。
          </Step>
        </ol>
        {/* 流れの合間で稼ぐコツは、屋台に貼った紙に書いて手順と分ける */}
        <ul className="mt-8 rounded-sm bg-yatai-kinari px-5 py-4 text-yatai-sumi shadow-[0_2px_8px_rgb(0_0_0/0.3)] sm:px-6">
          {[
            {
              title: "替え玉で時間を延ばす。",
              body: (
                <>
                  ミスなしで {KAEDAMA_GAUGE_MAX} キー打つと、制限時間が{" "}
                  {KAEDAMA_EXTENSION_MS / 1000} 秒延びます。
                </>
              ),
            },
            {
              title: "連続ボーナスを狙う。",
              body: (
                <>
                  ミスせず続けて平らげると倍率がかかります（
                  {describeStreakBonus()}）。
                </>
              ),
            },
            {
              title: "店主のおすすめを逃さない。",
              body: (
                <>
                  およそ {specialBowlInterval} 杯に 1 杯、値段が{" "}
                  {SPECIAL_BOWL_PRICE_RATE} 倍の特別な丼が出ます。
                </>
              ),
            },
          ].map(({ title, body }) => (
            <li
              key={title}
              className="border-yatai-sumi/20 border-t border-dashed py-3 first:border-t-0 first:pt-1 last:pb-1"
            >
              <p className="leading-heading font-bold">{title}</p>
              <p className="mt-1">{body}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="コースごとの違い">
        <p>長い注文ほど高く売れますが、打つのに時間がかかります。</p>
        {/* 屋台の壁に掛けた品書きの板。コースを 1 枚の板に行で並べ、名前と食券代を点線でつなぐ */}
        <div className="relative rounded-md bg-yatai-wood-dark px-5 py-5 shadow-[inset_0_2px_0_rgb(255_255_255/0.12)] sm:px-7">
          <span
            aria-hidden="true"
            className="absolute top-2 left-2 size-1.5 rounded-full bg-yatai-sumi"
          />
          <span
            aria-hidden="true"
            className="absolute top-2 right-2 size-1.5 rounded-full bg-yatai-sumi"
          />
          <ul>
            {COURSES.map((course) => {
              const guide = describeCourse(course);
              return (
                <li
                  key={course.id}
                  className="border-yatai-kinari/20 border-t border-dashed py-4 first:border-t-0 first:pt-0 last:pb-0"
                >
                  <div className="flex items-baseline gap-3">
                    <h3 className="text-lg leading-heading font-bold">
                      {course.name}
                    </h3>
                    <span
                      aria-hidden="true"
                      className="min-w-4 flex-1 border-yatai-kinari/30 border-b-2 border-dotted"
                    />
                    <dl className="flex items-baseline gap-2">
                      <dt className="text-sm text-yatai-kinari/75">食券代</dt>
                      <dd className="font-bold tabular-nums">
                        {guide.priceLabel}
                      </dd>
                    </dl>
                  </div>
                  <dl className="mt-1 flex flex-wrap gap-x-4 text-sm">
                    <div className="flex gap-2">
                      <dt className="text-yatai-kinari/75">食べ放題</dt>
                      <dd className="tabular-nums">{guide.timeLabel}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="text-yatai-kinari/75">注文</dt>
                      <dd className="tabular-nums">
                        {guide.readingLengthLabel}
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-2 text-sm">{COURSE_NOTES[course.id]}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </Section>

      <Section title="よくある質問">
        {/* 質問は太字、答えは本文の太さにして、質問と答えの間より質問どうしの間を広く空ける */}
        <dl className="space-y-7">
          {FAQS.map(({ question, answer }) => (
            <div key={question}>
              <dt className="leading-heading font-bold">{question}</dt>
              <dd className="mt-1.5">{answer}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </article>
  );
}
