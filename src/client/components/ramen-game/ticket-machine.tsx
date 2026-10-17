import {
  OUTLINE,
  SUMI,
  YataiDefs,
  YataiSky,
  YataiStall,
} from "@/client/components/ramen-game/yatai-scene";
import { StageSign } from "@/client/components/stage/stage-sign";
import type { Course } from "@/client/lib/ramen-course";

/**
 * 券売機の画面の背景。夜空の下、左に赤い券売機、右の奥に屋台を描く。
 * 食券のボタンは、券売機のボタン板（x 140〜500, y 196〜522）の上に重ねて置く
 */
function TicketMachineScene() {
  return (
    <svg
      viewBox="0 0 1280 720"
      aria-hidden="true"
      className="absolute inset-0 size-full"
    >
      <YataiDefs />
      <YataiSky />
      {/* 券売機の奥に、少し小さく屋台を置く */}
      <g transform="translate(540 250) scale(0.6)">
        <YataiStall />
      </g>
      <rect
        x={0}
        y={680}
        width={1280}
        height={40}
        fill="var(--color-yatai-night-deep)"
      />

      {/* 券売機の脚と本体 */}
      <rect x={140} y={660} width={40} height={28} fill={SUMI} />
      <rect x={460} y={660} width={40} height={28} fill={SUMI} />
      <rect
        x={110}
        y={86}
        width={420}
        height={584}
        rx={18}
        fill="var(--color-yatai-lantern)"
        {...OUTLINE}
      />
      <rect
        x={100}
        y={64}
        width={440}
        height={36}
        rx={10}
        fill="var(--color-yatai-lantern-dark)"
        {...OUTLINE}
      />

      {/* 灯りのともった「食券」の表示 */}
      <rect
        x={140}
        y={112}
        width={360}
        height={70}
        rx={8}
        fill="var(--color-yatai-amber)"
        {...OUTLINE}
      />
      <circle cx={170} cy={147} r={9} fill="var(--color-yatai-kinari)" />
      <circle cx={470} cy={147} r={9} fill="var(--color-yatai-kinari)" />
      <text
        x={320}
        y={163}
        textAnchor="middle"
        fontSize={46}
        letterSpacing={16}
        fill={SUMI}
        className="font-display"
      >
        食券
      </text>

      {/* 食券のボタンを並べる板 */}
      <rect
        x={140}
        y={196}
        width={360}
        height={326}
        rx={8}
        fill="var(--color-yatai-night-deep)"
        {...OUTLINE}
      />

      {/* 硬貨とお札の投入口 */}
      <rect
        x={150}
        y={538}
        width={120}
        height={62}
        rx={6}
        fill="var(--color-yatai-kinari)"
        {...OUTLINE}
      />
      <text
        x={190}
        y={576}
        textAnchor="middle"
        fontSize={20}
        fill={SUMI}
        className="font-display"
      >
        硬貨
      </text>
      <rect x={236} y={548} width={10} height={42} rx={4} fill={SUMI} />
      <rect
        x={290}
        y={538}
        width={200}
        height={62}
        rx={6}
        fill="var(--color-yatai-kinari)"
        {...OUTLINE}
      />
      <text
        x={340}
        y={576}
        textAnchor="middle"
        fontSize={20}
        fill={SUMI}
        className="font-display"
      >
        千円札
      </text>
      <rect x={384} y={564} width={92} height={10} rx={4} fill={SUMI} />

      {/* 食券の取出口 */}
      <rect x={200} y={614} width={240} height={42} rx={6} fill={SUMI} />
      <text
        x={320}
        y={642}
        textAnchor="middle"
        fontSize={18}
        fill="var(--color-yatai-kinari)"
        className="font-display"
      >
        取出口
      </text>
    </svg>
  );
}

type Props = {
  courses: readonly Course[];
  onSelect: (course: Course) => void;
};

/** 開始前の画面。屋台の脇の券売機で食券を買うと、そのコースでプレイが始まる */
export function TicketMachine({ courses, onSelect }: Props) {
  return (
    <section className="absolute inset-0">
      <TicketMachineScene />

      {/* 屋台の屋根に載せた看板 */}
      <div className="absolute bottom-[56%] left-[44%] flex w-[56%] justify-center">
        <StageSign />
      </div>

      {/* 遊び方: 屋台の壁に貼った貼り紙 */}
      <div className="absolute top-[63.6%] left-[55%] w-[24.2%] -rotate-2 rounded-[0.2cqw] border-[0.25cqw] border-yatai-sumi bg-yatai-kinari px-[1cqw] py-[0.6cqw] text-yatai-sumi shadow-[0.3cqw_0.3cqw_0_rgb(0_0_0/0.35)]">
        <h2 className="text-center font-display text-[1.5cqw] leading-tight">
          遊び方
        </h2>
        <p className="text-[1.15cqw] leading-snug font-bold">
          カウンターに出てくる注文をローマ字で打って平らげよう。
          お会計が食券代を超えれば元が取れる。
        </p>
      </div>

      {/* 食券のボタン: 券売機のボタン板の上に並べる */}
      <ul className="absolute top-[29.2%] left-[12.3%] flex h-[41%] w-[25.3%] flex-col gap-[1.2cqw]">
        {courses.map((course) => (
          <li key={course.id} className="flex-1">
            <button
              type="button"
              onClick={() => onSelect(course)}
              className="group flex size-full items-center gap-[1cqw] rounded-[0.6cqw] border-[0.35cqw] border-yatai-sumi bg-yatai-kinari px-[1.2cqw] text-yatai-sumi shadow-[0_0.5cqw_0_var(--color-yatai-wood-dark)] transition-[translate,box-shadow,background-color] duration-75 hover:bg-yatai-amber focus-visible:outline-[0.4cqw] focus-visible:outline-offset-[0.3cqw] focus-visible:outline-yatai-amber active:translate-y-[0.5cqw] active:shadow-none"
            >
              {/* 選べることを示すランプ。マウスを載せるかフォーカスすると灯る */}
              <span
                aria-hidden="true"
                className="size-[1.4cqw] shrink-0 rounded-full border-[0.25cqw] border-yatai-sumi bg-yatai-wood-dark group-hover:bg-yatai-lantern group-focus-visible:bg-yatai-lantern"
              />
              <span className="font-display text-[2.8cqw] leading-none">
                {course.name}
              </span>
              <span className="ml-auto flex flex-col items-end leading-tight">
                <span className="font-display text-[1.9cqw]">
                  {course.price.toLocaleString("ja-JP")}
                  <span className="text-[1.2cqw]"> 円</span>
                </span>
                <span className="text-[1.2cqw] font-bold">
                  制限時間 {course.timeLimitMs / 1000} 秒
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
