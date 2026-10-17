import { type Candidate, candidatesAt } from "@/client/lib/romaji/candidates";

export type TypingState = {
  /** ひらがなのよみ */
  reading: string;
  /** 打ち終えたよみの文字数 */
  position: number;
  /** 打ち終えた区切りのローマ字 */
  committed: string;
  /** いま打っている区切りで、まだ確定していないローマ字 */
  buffer: string;
};

export type InputResult = {
  state: TypingState;
  /** 正しいキーとして受け付けたか */
  accepted: boolean;
};

export function createTypingState(reading: string): TypingState {
  return { reading, position: 0, committed: "", buffer: "" };
}

function commit(state: TypingState, candidate: Candidate): TypingState {
  return {
    ...state,
    position: state.position + candidate.length,
    committed: state.committed + candidate.romaji,
    buffer: "",
  };
}

/** キーを 1 つ打つ。間違ったキーなら状態を変えずに accepted: false を返す */
export function inputKey(state: TypingState, key: string): InputResult {
  const candidates = candidatesAt(state.reading, state.position);
  const nextBuffer = state.buffer + key;
  const matches = candidates.filter((candidate) =>
    candidate.romaji.startsWith(nextBuffer),
  );

  if (matches.length > 0) {
    const exact = matches.find((candidate) => candidate.romaji === nextBuffer);
    const hasLonger = matches.some(
      (candidate) => candidate.romaji.length > nextBuffer.length,
    );
    // 「ん」の n のように、もっと長いつづりが続きうるあいだは確定を待つ
    if (exact && !hasLonger) {
      return { state: commit(state, exact), accepted: true };
    }
    return { state: { ...state, buffer: nextBuffer }, accepted: true };
  }

  // 打ちかけのつづりがそれだけで完結していれば（「ん」の n）、確定させて次の区切りで受け直す
  const pending = candidates.find(
    (candidate) => state.buffer !== "" && candidate.romaji === state.buffer,
  );
  if (pending) {
    const result = inputKey(commit(state, pending), key);
    if (result.accepted) return result;
  }
  return { state, accepted: false };
}

export function isComplete(state: TypingState): boolean {
  return state.position >= state.reading.length && state.buffer === "";
}

/** 打ったローマ字（確定前のものを含む） */
export function typedRomaji(state: TypingState): string {
  return state.committed + state.buffer;
}

/** 打つべき残りのローマ字。打ちかけのつづりに合う候補を優先して組み立てる */
export function remainingRomaji(state: TypingState): string {
  let rest = "";
  let position = state.position;
  const current = candidatesAt(state.reading, position).find((candidate) =>
    candidate.romaji.startsWith(state.buffer),
  );
  if (current) {
    rest += current.romaji.slice(state.buffer.length);
    position += current.length;
  }
  while (position < state.reading.length) {
    const [first] = candidatesAt(state.reading, position);
    // つづりの分からない文字は打てないので、そこで打ち切る
    if (!first) break;
    rest += first.romaji;
    position += first.length;
  }
  return rest;
}
