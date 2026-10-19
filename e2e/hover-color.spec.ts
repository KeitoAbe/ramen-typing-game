import { expect, test } from "@e2e/fixtures";

// 押せるものにマウスを載せたときの面の色が不透明で、後ろの絵が透けないことを確かめる。
// 規則は docs/design.md の「ホバーの色」

const KINARI = "rgb(243, 230, 200)";
const AMBER_PALE = "rgb(244, 208, 133)";
const AMBER = "rgb(245, 185, 66)";

test("トッピングの券は、選んでいなければ淡い琥珀色、選んでいれば琥珀色のまま、不透明な色で載せたことを示す", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^並/ }).click();

  const checkbox = page.getByRole("checkbox").first();
  const ticket = checkbox.locator("..");
  await expect(checkbox).toBeFocused();
  await expect(ticket).toHaveCSS("background-color", KINARI);

  // 選んでいない券: 生成りと琥珀色の中間の不透明な色にする
  await ticket.hover();
  await expect(ticket).toHaveCSS("background-color", AMBER_PALE);

  // 選んだ券: 載せても琥珀色のまま
  await ticket.click();
  await expect(checkbox).toBeChecked();
  await ticket.hover();
  await expect(ticket).toHaveCSS("background-color", AMBER);
});
