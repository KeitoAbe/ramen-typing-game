import { KANA_TABLE } from "@/client/lib/romaji/kana-table";

/** よみの 1 区切り（かな 1〜3 文字）と、それを打ち切るつづり */
export type Candidate = {
  romaji: string;
  /** このつづりで消化するよみの文字数 */
  length: number;
};

// 「ん」を n 1 打で済ませられない、次の文字の頭のつづり（母音・な行・や行）
const N_SINGLE_BLOCKERS = /^[aiueony]/;
// 促音で重ねてよい子音（n は「ん」と紛れるので重ねない。x・l は小書き文字のつづり）
const DOUBLABLE_CONSONANT = /^[bcdfghjkmpqrstvwyz]/;

/** 拗音（2 文字）と 1 文字のかなのつづり。促音と「ん」は含まない */
function plainCandidatesAt(reading: string, position: number): Candidate[] {
  const result: Candidate[] = [];
  const pair = reading.slice(position, position + 2);
  if (pair.length === 2) {
    for (const romaji of KANA_TABLE[pair] ?? []) {
      result.push({ romaji, length: 2 });
    }
  }
  for (const romaji of KANA_TABLE[reading.charAt(position)] ?? []) {
    result.push({ romaji, length: 1 });
  }
  return result;
}

function sokuonCandidatesAt(reading: string, position: number): Candidate[] {
  const doubled = plainCandidatesAt(reading, position + 1)
    .filter((next) => DOUBLABLE_CONSONANT.test(next.romaji))
    .map((next) => ({
      romaji: next.romaji.charAt(0) + next.romaji,
      length: next.length + 1,
    }));
  const single = ["xtu", "ltu", "xtsu", "ltsu"].map((romaji) => ({
    romaji,
    length: 1,
  }));
  return [...doubled, ...single];
}

function hatsuonCandidatesAt(reading: string, position: number): Candidate[] {
  const next = candidatesAt(reading, position + 1);
  // 末尾の「ん」は、n 1 打だと打ち終わりが確定しないので nn を求める
  const canSingle =
    next.length > 0 &&
    next.every((candidate) => !N_SINGLE_BLOCKERS.test(candidate.romaji));
  const romajis = canSingle ? ["n", "nn", "n'", "xn"] : ["nn", "n'", "xn"];
  return romajis.map((romaji) => ({ romaji, length: 1 }));
}

/**
 * よみの position から始まる区切りを打つつづりの候補を、表示に使う優先順で返す。
 * よみの末尾、またはつづりの分からない文字なら空配列を返す
 */
export function candidatesAt(reading: string, position: number): Candidate[] {
  const kana = reading.charAt(position);
  if (kana === "っ") return sokuonCandidatesAt(reading, position);
  if (kana === "ん") return hatsuonCandidatesAt(reading, position);
  return plainCandidatesAt(reading, position);
}
