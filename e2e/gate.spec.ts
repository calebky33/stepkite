import { expect, test } from "@playwright/test";

// Anonymous visitors: the tracker sends them to sign up in every market, and the CV builder
// opens as a sandbox draft with a sign-up prompt instead of the saved CV list.
for (const country of ["uk", "de"]) {
  test(`the ${country} tracker asks an anonymous visitor to sign up`, async ({ page }) => {
    await page.goto(`/${country}/tracker`);
    await expect(page).toHaveURL(new RegExp(`/sign-up\\?next=%2F${country}%2Ftracker`));
    await expect(
      page.getByRole("heading", { level: 1, name: "Create your account" }),
    ).toBeVisible();
  });
}

test("the CV sandbox keeps a draft on this device and offers sign up", async ({ page }) => {
  await page.goto("/uk/cv");
  await page.getByLabel("Full name", { exact: true }).fill("Asha Rao");
  // Saving in the sandbox is what asks the visitor to sign up.
  await page.getByRole("button", { name: "Save now" }).click();
  await expect(page.getByRole("region", { name: "Sign up to save your draft" })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Full name", { exact: true })).toHaveValue("Asha Rao");
  await expect(page.getByRole("button", { name: "My CVs" })).toHaveCount(0);
});

test("a tier 2 market offers the CV builder, not a salary calculator", async ({ page }) => {
  await page.goto("/de");
  await expect(page.getByRole("link", { name: "Build your CV" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Open the salary calculator" })).toHaveCount(0);
  await page.goto("/de/salary-calculator");
  await expect(
    page.getByRole("heading", { level: 1, name: "No salary tools for Germany yet" }),
  ).toBeVisible();
});

test("the ATS check updates as you type and the PDF button is ready", async ({ page }) => {
  await page.goto("/uk/cv");
  const panel = page.getByRole("heading", { name: "ATS check" });
  await expect(panel).toBeVisible();
  await expect(page.getByText("Add your email.", { exact: false })).toBeVisible();
  await page.getByLabel("Email", { exact: true }).fill("asha@example.com");
  await expect(page.getByText("Add your email.", { exact: false })).toHaveCount(0);
  await page.getByRole("button", { name: "Go to Full name in Contact" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Full name", { exact: true })).toBeFocused();
  await page.getByLabel("Full name", { exact: true }).fill("Asha Rao");
  await expect(page.getByRole("button", { name: "Download PDF" })).toBeEnabled();
});

test("sign-up asks for a country and passes it to Google sign-in", async ({ page }) => {
  await page.goto("/sign-up");
  const picker = page.getByRole("combobox", { name: "Your country" });
  await expect(picker).toBeVisible();
  await picker.click();
  await page.getByRole("option", { name: "Kenya" }).click();
  await expect(page.getByRole("link", { name: "Continue with Google" })).toHaveAttribute(
    "href",
    /[?&]country=ke(&|$)/,
  );
});

test("every market has a real flag in the footer", async ({ page }) => {
  await page.goto("/");
  const flags = page.locator("footer img[src^='/flags/']");
  await expect(flags).toHaveCount(23);
  const res = await page.request.get("/flags/sa.svg");
  expect(res.ok()).toBe(true);
});
