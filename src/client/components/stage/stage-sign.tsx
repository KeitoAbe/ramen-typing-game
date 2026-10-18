/** 舞台の上に掛ける店の看板。ページの見出し（h1）は舞台の下の紹介に置くので、ここは見出しにしない */
export function StageSign() {
  return (
    <p className="rounded-[0.6cqw] border-[0.4cqw] border-yatai-sumi bg-yatai-lantern px-[3cqw] py-[0.8cqw] font-display text-[max(20px,3.2cqw)] leading-tight tracking-widest text-yatai-kinari shadow-[0_0_3cqw_rgb(245_185_66/0.45)]">
      ラーメン屋台
    </p>
  );
}
