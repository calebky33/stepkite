import { expect, test } from "@playwright/test";

test("home page shows the logo, the headline and the tool sections", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("banner").getByRole("img", { name: "Stepkite" })).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 1, name: /make your next career move/i }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: /everything you need/i })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: /take-home pay/i })).toBeVisible();
});

test("the mobile menu opens, closes with Escape and keeps the tools inside the country", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/us");
  const button = page.getByRole("button", { name: /menu/i });
  await button.click();
  await expect(button).toHaveAttribute("aria-expanded", "true");
  const menu = page.locator("#site-menu");
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("navigation", { name: "Mobile" })).toBeVisible();
  await expect(menu.getByRole("link", { name: "Resume builder" })).toHaveAttribute(
    "href",
    "/us/cv",
  );
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(menu).toHaveAttribute("hidden", "");
  await expect(button).toBeFocused();
});
