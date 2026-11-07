import { expect, test as setup } from "@playwright/test";
import { AUTH_FILE } from "./constants";

// Signs in once with the dedicated test account and saves the session for the signed-in project.
setup("sign in with the test account", async ({ page }) => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password) throw new Error("E2E_EMAIL and E2E_PASSWORD must be set");

  await page.goto("/sign-in?next=/account");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/account/);
  await page.context().storageState({ path: AUTH_FILE });
});
