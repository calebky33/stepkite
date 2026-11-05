import { describe, expect, it } from "vitest";
import { shouldRedirect, shouldRedirectWhenSignedIn } from "./proxy";

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

describe("shouldRedirectWhenSignedIn", () => {
  it("sends signed in visitors away from the sign in and sign up forms", () => {
    expect(shouldRedirectWhenSignedIn("/sign-in", true)).toBe(true);
    expect(shouldRedirectWhenSignedIn("/sign-up", true)).toBe(true);
    expect(shouldRedirectWhenSignedIn("/sign-up/anything", true)).toBe(true);
  });

  it("lets anonymous visitors see the forms", () => {
    expect(shouldRedirectWhenSignedIn("/sign-in", false)).toBe(false);
    expect(shouldRedirectWhenSignedIn("/sign-up", false)).toBe(false);
  });

  it("does not match prefix neighbors", () => {
    expect(shouldRedirectWhenSignedIn("/sign-insurance", true)).toBe(false);
    expect(shouldRedirectWhenSignedIn("/signage", true)).toBe(false);
  });

  it("leaves other paths untouched for signed in users", () => {
    expect(shouldRedirectWhenSignedIn("/", true)).toBe(false);
    expect(shouldRedirectWhenSignedIn("/account", true)).toBe(false);
    expect(shouldRedirectWhenSignedIn("/pricing", true)).toBe(false);
  });
});

// WHATWG URL parsing normalises backslashes to slashes in special-scheme URLs. A naive
// "startsWith('/')" check would miss "/\\evil.com" and redirect off-origin. These sanity
// checks document the shape the proxy must defend against; the proxy branch itself calls
// `new URL(nextParam, origin)` and compares `target.origin` to catch any such case.
describe("WHATWG URL open-redirect sanity", () => {
  const origin = "https://stepkite.example";

  it("resolves a backslashed next to an off-origin URL", () => {
    expect(new URL("/\\evil.com", origin).origin).toBe("https://evil.com");
  });

  it("resolves a double-slash next to an off-origin URL", () => {
    expect(new URL("//evil.com", origin).origin).toBe("https://evil.com");
  });

  it("resolves a plain path next to the same origin", () => {
    expect(new URL("/account", origin).origin).toBe(origin);
  });
});
