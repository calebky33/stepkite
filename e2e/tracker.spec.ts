import { expect, test } from "@playwright/test";

// Full tracker flow: add a job, see it on the board, open the detail panel, close with Escape.
test("add and open a job on the UK tracker", async ({ page }) => {
  await page.goto("/uk/tracker");
  await expect(page.getByRole("heading", { name: "Track your applications" })).toBeVisible();

  await page.getByRole("textbox", { name: "Job title" }).fill("Senior Data Engineer");
  await page.getByRole("textbox", { name: "Company" }).fill("Acme UK");
  await page.getByRole("button", { name: /^Add job$/ }).click();

  const card = page.locator("[data-open-job]").filter({ hasText: "Senior Data Engineer" });
  await expect(card).toBeVisible();
  await card.click();
  await expect(page.getByRole("dialog").filter({ hasText: "Senior Data Engineer" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog").filter({ hasText: "Senior Data Engineer" })).toBeHidden();
});
