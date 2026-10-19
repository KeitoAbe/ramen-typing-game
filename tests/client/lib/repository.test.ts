import { CONTRIBUTING_URL, REPOSITORY_URL } from "@/client/lib/repository";

describe("repository", () => {
  it("リポジトリの URL は GitHub のリポジトリを指す", () => {
    expect(REPOSITORY_URL).toBe(
      "https://github.com/KeitoAbe/ramen-typing-game",
    );
  });

  it("参加の仕方の URL は、リポジトリの URL から作る", () => {
    expect(CONTRIBUTING_URL).toBe(
      `${REPOSITORY_URL}/blob/main/CONTRIBUTING.md`,
    );
  });
});
