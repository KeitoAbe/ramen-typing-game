// 作業ツリーに残った、途中のマージ・リベース・cherry-pick を見分けて取り消す。
// セッションが途中で打ち切られる（利用上限など）と、コンフリクトを抱えたまま残ることがあり、
// そのままでは git stash も checkout もできない。

import { existsSync, readFileSync } from "node:fs";
import { git } from "./gh";

export type GitOperation = "merge" | "rebase" | "cherry-pick";

export interface InProgressOperation {
  kind: GitOperation;
  /** 操作しているブランチ。リベース中は HEAD が外れているので、git の内部ファイルから読む */
  branch: string;
}

/** git ディレクトリの中のファイルの読み方。テストで差し替える */
export interface GitDirReader {
  exists(name: string): boolean;
  read(name: string): string | null;
}

/** 途中の操作を見分ける。何も無ければ null */
export function detectGitOperation(
  reader: GitDirReader,
  currentBranch: string,
): InProgressOperation | null {
  for (const dir of ["rebase-merge", "rebase-apply"]) {
    if (!reader.exists(dir)) continue;
    const headName = reader.read(`${dir}/head-name`)?.trim() ?? "";
    return { kind: "rebase", branch: headName.replace(/^refs\/heads\//, "") };
  }
  if (reader.exists("MERGE_HEAD")) {
    return { kind: "merge", branch: currentBranch };
  }
  if (reader.exists("CHERRY_PICK_HEAD")) {
    return { kind: "cherry-pick", branch: currentBranch };
  }
  return null;
}

const gitDirReader: GitDirReader = {
  exists: (name) => existsSync(git(["rev-parse", "--git-path", name]).trim()),
  read: (name) => {
    try {
      return readFileSync(
        git(["rev-parse", "--git-path", name]).trim(),
        "utf8",
      );
    } catch {
      return null;
    }
  },
};

export function currentGitOperation(): InProgressOperation | null {
  const branch = git(["branch", "--show-current"]).trim();
  return detectGitOperation(gitDirReader, branch);
}

export function abortGitOperation(kind: GitOperation): void {
  git([kind, "--abort"]);
}
