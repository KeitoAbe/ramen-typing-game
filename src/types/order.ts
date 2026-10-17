/** 屋台のカウンターに出てくる注文（問題文） */
export type Order = {
  id: string;
  /** 画面に出す漢字かな交じりの文 */
  text: string;
  /** ローマ字判定に使うひらがなのよみ */
  reading: string;
};
