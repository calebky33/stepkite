import { defineConfig, type Project } from "@playwright/test";
import { AUTH_FILE } from "./e2e/constants";

/**
 * Two kinds of e2e test.
 *
 * Anonymous: runs everywhere. Covers open pages, the CV sandbox and the sign-up gate.
 *
 * Signed in: the CV list, CV import and the tracker need a real account. They run only when
 * E2E_EMAIL and E2E_PASSWORD are set in the shell for a dedicated test account. The setup
 * project signs in once through the real form and stores the session in e2e/.auth (ignored by
 * git). Never commit the credentials or the stored session.
 */
const hasTestAccount = Boolean(process.env.E2E_EMAIL && process.env.E2E_PASSWORD);
const SIGNED_IN_SPECS = /(cv|tracker)\.spec\.ts$/;

const projects: Project[] = [
  { name: "anonymous", testIgnore: [SIGNED_IN_SPECS, /auth\.setup\.ts$/] },
];

if (hasTestAccount) {
  projects.push(
    { name: "setup", testMatch: /auth\.setup\.ts$/ },
    {
      name: "signed-in",
      testMatch: SIGNED_IN_SPECS,
      dependencies: ["setup"],
      use: { storageState: AUTH_FILE },
    },
  );
} else {
  process.stderr.write(
    "e2e: E2E_EMAIL and E2E_PASSWORD are not set, so the signed-in CV and tracker tests are skipped.\n",
  );
}

export default defineConfig({
  testDir: "e2e",
  webServer: { command: "pnpm dev", url: "http://localhost:3000", reuseExistingServer: true },
  use: { baseURL: "http://localhost:3000" },
  projects,
});
