import {
  detectGitOperation,
  type GitDirReader,
} from "@scripts/loop/git-operation";

const reader = (files: Record<string, string>): GitDirReader => ({
  exists: (name) =>
    Object.keys(files).some((f) => f === name || f.startsWith(`${name}/`)),
  read: (name) => files[name] ?? null,
});

describe("detectGitOperation", () => {
  it("何も途中でなければ null", () => {
    expect(detectGitOperation(reader({}), "loop/issue-1-x")).toBeNull();
  });

  it("マージの途中なら、いまのブランチで merge を返す", () => {
    expect(
      detectGitOperation(reader({ MERGE_HEAD: "abc" }), "loop/issue-1-x"),
    ).toEqual({ kind: "merge", branch: "loop/issue-1-x" });
  });

  it("cherry-pick の途中なら cherry-pick を返す", () => {
    expect(
      detectGitOperation(reader({ CHERRY_PICK_HEAD: "abc" }), "loop/a"),
    ).toEqual({ kind: "cherry-pick", branch: "loop/a" });
  });

  it("リベースの途中は HEAD が外れているので、ブランチ名を head-name から読む", () => {
    for (const dir of ["rebase-merge", "rebase-apply"]) {
      expect(
        detectGitOperation(
          reader({ [`${dir}/head-name`]: "refs/heads/loop/issue-2-y\n" }),
          "",
        ),
      ).toEqual({ kind: "rebase", branch: "loop/issue-2-y" });
    }
  });
});
