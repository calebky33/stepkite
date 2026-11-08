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
  // Match the path only. `/sign-in?next=/account` also contains "/account", so a loose pattern
  // passed while the form was still on screen and saved an empty session.
  await expect(page).toHaveURL((url) => url.pathname === "/account");
  // Fail loudly here rather than shipping an empty state to every signed-in test.
  const cookies = await page.context().cookies();
  if (!cookies.some((cookie) => cookie.name.startsWith("sb-"))) {
    throw new Error("sign-in left no Supabase session cookie");
  }
  await page.context().storageState({ path: AUTH_FILE });
});
