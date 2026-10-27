import { expect, test } from "@playwright/test";

test("home page shows the logo and heading", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("img", { name: "Stepkite" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
