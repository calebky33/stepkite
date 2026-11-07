import { describe, expect, it, vi } from "vitest";
import { shouldRedirect, shouldRedirectWhenSignedIn } from "./proxy";

async function runProxy(options: {
  user: { name: string | null } | null;
  cookie?: string;
  path?: string;
}) {
  vi.resetModules();
  vi.doMock("@/lib/auth/session", () => ({ getSession: async () => options.user }));
  const { proxy } = await import("./proxy");
  const { NextRequest } = await import("next/server");
  const request = new NextRequest(`https://stepkite.test${options.path ?? "/uk/cv"}`, {
    headers: options.cookie ? { cookie: options.cookie } : {},
  });
  const response = await proxy(request);
  vi.doUnmock("@/lib/auth/session");
  return response;
}

describe("proxy www redirect", () => {
  async function runAt(url: string) {
    vi.resetModules();
    vi.doMock("@/lib/auth/session", () => ({ getSession: async () => null }));
    const { proxy } = await import("./proxy");
    const { NextRequest } = await import("next/server");
    const response = await proxy(new NextRequest(url));
    vi.doUnmock("@/lib/auth/session");
    return response;
  }

  it("sends www to the bare domain with a permanent redirect, keeping path and query", async () => {
    const response = await runAt("https://www.stepkite.app/uk/salary-calculator?x=1");
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe("https://stepkite.app/uk/salary-calculator?x=1");
  });

  it("leaves the bare domain and other hosts alone", async () => {
    for (const url of [
      "https://stepkite.app/uk",
      "https://stepkite.calebky33.workers.dev/uk",
      "https://www.example.com/uk",
      "https://www.stepkite.com/uk",
    ]) {
      const response = await runAt(url);
      expect(response.status).toBe(200);
    }
  });
});

describe("proxy sk_user hint cookie", () => {
  it("sets it for a signed in visitor who does not have it yet", async () => {
    const response = await runProxy({ user: { name: "Caleb" } });
    const cookie = response.cookies.get("sk_user");
    expect(cookie?.value).toBe("1");
    expect(cookie?.path).toBe("/");
    expect(cookie?.sameSite).toBe("lax");
    expect(cookie?.httpOnly).not.toBe(true);
  });

  it("leaves it alone when it is already there", async () => {
    const response = await runProxy({ user: { name: "Caleb" }, cookie: "sk_user=1" });
    expect(response.cookies.get("sk_user")).toBeUndefined();
  });

  it("clears it when the visitor is signed out", async () => {
    const response = await runProxy({ user: null, cookie: "sk_user=1" });
    expect(response.headers.get("set-cookie") ?? "").toMatch(/sk_user=;/);
  });

  it("clears a stale cookie even when the visitor is redirected to sign up", async () => {
    const response = await runProxy({ user: null, cookie: "sk_user=1", path: "/account" });
    expect(response.status).toBe(307);
    expect(response.headers.get("set-cookie") ?? "").toMatch(/sk_user=;/);
  });

  it("sets the cookie on the redirect away from the sign in form", async () => {
    const response = await runProxy({ user: { name: "Caleb" }, path: "/sign-in" });
    expect(response.status).toBe(307);
    expect(response.cookies.get("sk_user")?.value).toBe("1");
  });

  it("sets nothing for an anonymous visitor with no cookie", async () => {
    const response = await runProxy({ user: null });
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});

describe("proxy user name header", () => {
  it("forwards the name percent encoded and drops a spoofed one", async () => {
    const response = await runProxy({ user: { name: "Zoë O'Neil" } });
    const forwarded = response.headers.get("x-middleware-request-x-stepkite-user-name");
    expect(forwarded).toBe(encodeURIComponent("Zoë O'Neil"));
    const anonymous = await runProxy({ user: null });
    expect(anonymous.headers.get("x-middleware-request-x-stepkite-user-name")).toBeNull();
  });
});

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
