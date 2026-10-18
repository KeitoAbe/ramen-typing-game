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
  nami: "短い注文が出る、いちばん手軽なコース。はじめての人やタイピングに慣れていない人はここから。",
  oomori:
    "少し長めの注文が出るコース。並で元が取れるようになったら、腕試しにどうぞ。",
  tokumori:
    "長い注文ばかりが出る、いちばん食べごたえのあるコース。称号「屋台の伝説」は特盛りでしか取れない。",
};

type Faq = { question: string; answer: string };

const FAQS: readonly Faq[] = [
  {
    question: "キーを打っても文字が入らない",
    answer:
      "日本語入力（IME）がオンになっていると打てません。半角英数に切り替えてから打ってください。オンのまま打つと、画面にも切り替えの案内が出ます。",
  },
  {
    question: "スマホやタブレットで遊べますか？",
    answer:
      "PC のキーボードで遊ぶゲームです。タッチ操作では文字を打てないので、スマホやタブレットでは遊べません。",
  },
  {
    question: "ローマ字のつづりは決まっていますか？",
    answer:
      "よく使われるつづりならどれでも打てます。たとえば「し」は shi・si・ci、「ふ」は fu・hu のどちらでも構いません。打つたびに、画面のローマ字の見本が打ったつづりに合わせて変わります。",
  },
  {
    question: "自己ベストはどこに保存されますか？",
    answer:
      "遊んでいるブラウザの中（localStorage）に保存します。サーバーには送りません。別のブラウザや端末には引き継がれず、ブラウザのサイトデータを消すと記録も消えます。効果音のオン・オフの設定も同じように保存します。",
  },
  {
    question: "効果音を消せますか？",
    answer:
      "ゲーム画面の右上にある「効果音」の札を押すと、オン・オフを切り替えられます。",
  },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="border-b-2 border-yatai-wood pb-2 font-display text-xl leading-snug text-yatai-amber sm:text-2xl">
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
    <article className="mx-auto w-full max-w-3xl px-5 py-16 text-base leading-relaxed wrap-break-word sm:px-8">
      <header>
        <h1 className="font-display text-2xl leading-snug text-yatai-kinari sm:text-3xl">
          ラーメン屋台タイピング
          <span className="mt-1 block text-base text-yatai-amber sm:text-lg">
            注文をローマ字で打って、ラーメンを平らげるタイピングゲーム
          </span>
        </h1>
      </header>

      <Section title="どんなゲーム？">
        <p>
          夜のラーメン屋台が舞台のタイピングゲームです。券売機で食券を買うと、制限時間のあいだラーメンが食べ放題。カウンターに出てくる丼の注文を、キーボードでローマ字で打ち切ると一杯平らげたことになります。
        </p>
        <p>
          平らげた丼の値段はお会計に積み上がっていきます。閉店（時間切れ）までにお会計が食券代を上回れば元が取れて「お得」、届かなければ「損」。速く、正確に打つほどお得になります。
        </p>
      </Section>

      <Section title="遊び方">
        <ol className="list-decimal space-y-3 pl-6 marker:font-bold marker:text-yatai-amber">
          <li>
            <strong className="text-yatai-amber">食券を買う。</strong>
            屋台の脇の券売機で、並・大盛り・特盛りのどれかの食券を選びます。食券が出てくると、すぐにプレイが始まります。
          </li>
          <li>
            <strong className="text-yatai-amber">注文をローマ字で打つ。</strong>
            丼の手前の木札に、注文の文とそのよみ、打つローマ字が出ます。半角英数でローマ字を打ち切ると平らげて、次の丼が出てきます。打ち間違えるとミスタイプに数えます。
          </li>
          <li>
            <strong className="text-yatai-amber">麺がのびる前に食べる。</strong>
            丼の値段はよみ 1 文字あたり {PRICE_PER_KANA}{" "}
            円です。出てすぐの「できたて」のうちに平らげると定価の{" "}
            {FRESH_PRICE_RATE}{" "}
            倍で売れ、時間がたって「のびかけ」になると値段が下がって、のびきる直前には定価の{" "}
            {MIN_PRICE_RATE}{" "}
            倍になります。のびきった丼は下げられ、お会計には入りません。のびるまでの残り秒数は丼の横の札に出ます。
          </li>
          <li>
            <strong className="text-yatai-amber">替え玉で時間を延ばす。</strong>
            ミスなしで {KAEDAMA_GAUGE_MAX}{" "}
            キー打つたびに替え玉になり、制限時間が {KAEDAMA_EXTENSION_MS / 1000}{" "}
            秒延びます。打ち間違えると替え玉のゲージは 0 に戻ります。
          </li>
          <li>
            <strong className="text-yatai-amber">連続ボーナスを狙う。</strong>
            ミスなしで、丼を下げられずに続けて平らげると、丼の値段に倍率がかかります（
            {describeStreakBonus()}
            ）。打ち間違えたり、丼を下げられたりすると連続は途切れます。
          </li>
          <li>
            <strong className="text-yatai-amber">
              店主のおすすめを逃さない。
            </strong>
            およそ {specialBowlInterval} 杯に 1
            杯、「店主のおすすめ」の特別な丼が出ます。値段が{" "}
            {SPECIAL_BOWL_PRICE_RATE}{" "}
            倍になるので、できたてのうちに平らげましょう。
          </li>
          <li>
            <strong className="text-yatai-amber">伝票で成績を見る。</strong>
            閉店すると、お会計と食券代の差額、打鍵の速さや正確さ、打ち間違いの多いキーが伝票に出ます。成績に応じた称号がもらえ、コースごとの自己ベストを更新すると知らせます。成績は
            X で共有できます。
          </li>
        </ol>
      </Section>

      <Section title="コースごとの違い">
        <p>
          コースによって、食券代と食べ放題の時間、出てくる注文の長さが変わります。長い注文ほど丼の値段は高くなりますが、打ち切るまでの時間もかかります。
        </p>
        <ul className="grid gap-4 sm:grid-cols-3">
          {COURSES.map((course) => {
            const guide = describeCourse(course);
            return (
              <li
                key={course.id}
                className="rounded-md border-2 border-yatai-wood bg-yatai-night p-4"
              >
                <h3 className="font-display text-xl text-yatai-kinari">
                  {course.name}
                </h3>
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 text-sm">
                  <dt className="text-yatai-amber">食券代</dt>
                  <dd>{guide.priceLabel}</dd>
                  <dt className="text-yatai-amber">食べ放題</dt>
                  <dd>{guide.timeLabel}</dd>
                  <dt className="text-yatai-amber">注文</dt>
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
              <dt className="font-bold text-yatai-amber">Q. {question}</dt>
              <dd className="mt-1">A. {answer}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </article>
  );
}
