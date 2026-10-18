import type { ReactNode } from "react";
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
    <section className="mt-12">
      <h2 className="border-b-2 border-yatai-wood pb-2 text-xl leading-heading font-bold sm:text-2xl">
        {title}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
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
    <article className="mx-auto w-full max-w-3xl px-5 py-16 text-base leading-body wrap-break-word sm:px-8">
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
        <ol className="list-decimal space-y-3 pl-6 marker:font-bold marker:text-yatai-kinari/75">
          <li>
            <strong>食券を買う。</strong>
            並・大盛り・特盛りから選ぶと始まります。
          </li>
          <li>
            <strong>注文をローマ字で打つ。</strong>
            木札の注文を打ち切ると、次の丼が出ます。
          </li>
          <li>
            <strong>麺がのびる前に食べる。</strong>
            丼はよみ 1 文字 {PRICE_PER_KANA} 円で、できたてなら{" "}
            {FRESH_PRICE_RATE} 倍で売れます。のびるほど安くなり（最低{" "}
            {MIN_PRICE_RATE} 倍）、のびきると下げられます。
          </li>
          <li>
            <strong>替え玉で時間を延ばす。</strong>
            ミスなしで {KAEDAMA_GAUGE_MAX} キー打つと、制限時間が{" "}
            {KAEDAMA_EXTENSION_MS / 1000} 秒延びます。
          </li>
          <li>
            <strong>連続ボーナスを狙う。</strong>
            ミスせず続けて平らげると倍率がかかります（
            {describeStreakBonus()}）。
          </li>
          <li>
            <strong>店主のおすすめを逃さない。</strong>
            およそ {specialBowlInterval} 杯に 1 杯、値段が{" "}
            {SPECIAL_BOWL_PRICE_RATE} 倍の特別な丼が出ます。
          </li>
          <li>
            <strong>伝票で成績を見る。</strong>
            閉店すると、損得や速さ、苦手なキー、称号が出ます。成績は X
            で共有できます。
          </li>
        </ol>
      </Section>

      <Section title="コースごとの違い">
        <p>長い注文ほど高く売れますが、打つのに時間がかかります。</p>
        <ul className="grid gap-4 sm:grid-cols-3">
          {COURSES.map((course) => {
            const guide = describeCourse(course);
            return (
              <li
                key={course.id}
                className="rounded-md bg-yatai-wood-dark p-4 shadow-[inset_0_2px_0_rgb(255_255_255/0.12)]"
              >
                <h3 className="text-lg leading-heading font-bold">
                  {course.name}
                </h3>
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 text-sm">
                  <dt className="text-yatai-kinari/75">食券代</dt>
                  <dd>{guide.priceLabel}</dd>
                  <dt className="text-yatai-kinari/75">食べ放題</dt>
                  <dd>{guide.timeLabel}</dd>
                  <dt className="text-yatai-kinari/75">注文</dt>
                  <dd>{guide.readingLengthLabel}</dd>
                </dl>
                <p className="mt-3 text-sm">{COURSE_NOTES[course.id]}</p>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title="よくある質問">
        <dl className="space-y-6">
          {FAQS.map(({ question, answer }) => (
            <div key={question}>
              <dt className="font-bold">Q. {question}</dt>
              <dd className="mt-1">A. {answer}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </article>
  );
}
