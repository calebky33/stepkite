import { describe, expect, it } from "vitest";
import { shouldRedirect } from "./proxy";

describe("shouldRedirect", () => {
  it("sends anonymous visitors to sign up for gated routes", () => {
    expect(shouldRedirect("/account", false)).toBe(true);
    expect(shouldRedirect("/account/settings", false)).toBe(true);
    expect(shouldRedirect("/billing", false)).toBe(true);
    expect(shouldRedirect("/uk/tracker", false)).toBe(true);
    expect(shouldRedirect("/us/tracker/applications", false)).toBe(true);
    expect(shouldRedirect("/in/tracker", false)).toBe(true);
  });

  it("lets open pages through for anonymous visitors", () => {
    expect(shouldRedirect("/", false)).toBe(false);
    expect(shouldRedirect("/pricing", false)).toBe(false);
    expect(shouldRedirect("/uk/salary-calculator", false)).toBe(false);
    expect(shouldRedirect("/uk/cv", false)).toBe(false);
    expect(shouldRedirect("/sign-up", false)).toBe(false);
    // A path that only shares a prefix with a gated one must not match.
    expect(shouldRedirect("/accountant", false)).toBe(false);
    expect(shouldRedirect("/billings", false)).toBe(false);
    expect(shouldRedirect("/uk/trackers", false)).toBe(false);
  });

  it("lets signed in users through on every path", () => {
    expect(shouldRedirect("/account", true)).toBe(false);
    expect(shouldRedirect("/billing", true)).toBe(false);
    expect(shouldRedirect("/uk/tracker", true)).toBe(false);
  });
});
