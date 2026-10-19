import { expect, test } from "@e2e/fixtures";

// オープンソースであることと、開発への参加の仕方を、フッターと運営者情報のページで案内する

const REPOSITORY_URL = "https://github.com/KeitoAbe/ramen-typing-game";
const PAGE_PATHS = ["/", "/privacy", "/about", "/contact"];

for (const path of PAGE_PATHS) {
  test(`${path} のフッターに、オープンソースの一文とリポジトリへのリンクがある`, async ({
    page,
  }) => {
    await page.goto(path);
    const footer = page.getByRole("contentinfo");
    await expect(footer).toContainText("オープンソース（MIT ライセンス）");
    const link = footer.getByRole("link", {
      name: /^GitHub のリポジトリ\s*（新しいタブで開きます）$/,
    });
    await expect(link).toHaveAttribute("href", REPOSITORY_URL);
    await expect(link).toHaveAttribute("target", "_blank");
  });
}

test("運営者情報のページに「開発に参加する」節があり、参加の仕方へのリンクがある", async ({
  page,
}) => {
  await page.goto("/about");
  const main = page.getByRole("main");
  await expect(
    main.getByRole("heading", { level: 2, name: "開発に参加する" }),
  ).toBeVisible();
  const link = main.getByRole("link", {
    name: /^参加のしかた（CONTRIBUTING\.md）\s*（新しいタブで開きます）$/,
  });
  await expect(link).toHaveAttribute(
    "href",
    `${REPOSITORY_URL}/blob/main/CONTRIBUTING.md`,
  );
  await expect(link).toHaveAttribute("target", "_blank");
});

for (const viewport of [
  { width: 1366, height: 768 },
  { width: 390, height: 844 },
]) {
  test.describe(`${viewport.width}px 幅`, () => {
    test.use({ viewport });

    for (const path of ["/", "/about"]) {
      test(`${path} はフッターと案内を足しても横にはみ出さない`, async ({
        page,
      }) => {
        await page.goto(path);
        const footer = page.getByRole("contentinfo");
        await footer.scrollIntoViewIfNeeded();
        await expect(footer).toBeVisible();
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(viewport.width);
        const box = await footer
          .getByText("オープンソース（MIT ライセンス）")
          .boundingBox();
        expect(box).not.toBeNull();
        expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(
          viewport.width,
        );
      });
    }
  });
}
