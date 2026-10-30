import { expect, test } from "@playwright/test";

test("a CV survives a reload, can be undone, and is erased by Delete my data", async ({ page }) => {
  await page.goto("/uk/cv");
  const name = page.getByLabel("Full name", { exact: true });
  await name.fill("Asha Rao");
  await expect(page.getByRole("status").filter({ hasText: "Saved on this device" })).toBeVisible();
  await expect(page.getByText("Your CV stays on this device.")).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("Full name", { exact: true })).toHaveValue("Asha Rao");

  // The undo history lives in memory, so make a new edit after the reload and undo that one.
  await page.getByLabel("Full name", { exact: true }).fill("Asha Rao Jr");
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByLabel("Full name", { exact: true })).toHaveValue("Asha Rao");

  await page.keyboard.press("Control+S");
  await expect(page.getByRole("status").filter({ hasText: "Saved on this device" })).toBeVisible();

  await page.getByRole("button", { name: "My CVs" }).click();
  await page.getByRole("button", { name: "Delete my data" }).click();
  await page
    .getByRole("dialog", { name: "Delete all your data?" })
    .getByRole("button", { name: "Delete everything" })
    .click();
  await expect(page.getByText("Everything was erased from this device.")).toBeVisible();
});

test("duplicate, delete and restore from the list", async ({ page }) => {
  await page.goto("/uk/cv");
  await page.getByLabel("Name of this CV").fill("Graduate UK");
  await page.getByRole("button", { name: "Save now" }).click();
  await page.getByRole("button", { name: "My CVs" }).click();
  await page.getByRole("button", { name: "Duplicate Graduate UK" }).click();
  await expect(page.getByText("Copy of Graduate UK", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Delete Copy of Graduate UK" }).click();
  await page
    .getByRole("dialog", { name: "Delete this CV?" })
    .getByRole("button", { name: "Delete" })
    .click();
  await page.getByRole("button", { name: "Restore Copy of Graduate UK" }).click();
  await expect(page.getByRole("button", { name: "Open Copy of Graduate UK" })).toBeVisible();
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

test("an old CV is read on the device, reviewed, and saved as a new CV", async ({ page }) => {
  const uploads: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET") uploads.push(request.url());
  });
  await page.goto("/uk/cv");
  await page.getByRole("button", { name: "Upload it" }).click();
  await expect(page.getByRole("heading", { name: "Upload your old CV" })).toBeVisible();

  await page.getByLabel("Choose your old CV file").setInputFiles("e2e/fixtures/not-a-cv.exe");
  await expect(page.getByRole("alert").filter({ hasText: "That file type does not work here" })).toBeVisible();

  await page.getByLabel("Choose your old CV file").setInputFiles("e2e/fixtures/old-cv.txt");
  await expect(page.getByRole("heading", { name: /Check what we found/ })).toBeFocused();
  await expect(page.getByLabel("Full name (full name)")).toHaveValue("Priya Nair");
  await page.getByLabel("Job title (job)").fill("Support lead");

  await page.getByRole("button", { name: "Create my CV" }).click();
  await expect(page.getByLabel("Full name", { exact: true })).toHaveValue("Priya Nair");
  expect(uploads).toEqual([]);
});

test("Escape leaves the review screen without saving", async ({ page }) => {
  await page.goto("/uk/cv");
  await page.getByRole("button", { name: "Upload it" }).click();
  await page.getByLabel("Choose your old CV file").setInputFiles("e2e/fixtures/old-cv.txt");
  await expect(page.getByRole("heading", { name: /Check what we found/ })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("Full name", { exact: true })).toHaveValue("");
});
