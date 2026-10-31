import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";
import { config, proxy } from "../../proxy";

async function configHeaders(): Promise<Map<string, string>> {
  const rules = (await nextConfig.headers?.()) ?? [];
  return new Map(rules.flatMap((r) => r.headers).map((h) => [h.key, h.value]));
}

describe("security headers", () => {
  it("sets each static header", async () => {
    const h = await configHeaders();
    expect(h.get("Strict-Transport-Security")).toBe("max-age=31536000; includeSubDomains");
    expect(h.get("X-Content-Type-Options")).toBe("nosniff");
    expect(h.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(h.get("Permissions-Policy")).toContain("camera=()");
    expect(h.get("Permissions-Policy")).toContain("payment=()");
    expect(h.get("X-Frame-Options")).toBe("DENY");
    expect(h.get("Cross-Origin-Opener-Policy")).toBe("same-origin");
  });

  it("enforces the CSP without eval and with frame-ancestors none", () => {
    const res = proxy(new NextRequest("https://stepkite.com/uk"));
    const csp = res.headers.get("Content-Security-Policy") ?? "";
    expect(res.headers.get("Content-Security-Policy-Report-Only")).toBeNull();
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toContain("unsafe-eval");
  });

  it("adds manifest-src and upgrade-insecure-requests outside development", () => {
    const csp =
      proxy(new NextRequest("https://stepkite.com/uk")).headers.get("Content-Security-Policy") ??
      "";
    expect(csp).toContain("manifest-src 'self'");
    expect(csp).toContain("upgrade-insecure-requests");
    expect(csp).not.toContain("frame-src");
    expect(csp).not.toContain("worker-src");
  });

  it("matcher covers /apiary but not /api/health or static assets", () => {
    const re = new RegExp(`^${config.matcher[0].source}$`);
    expect(re.test("/apiary")).toBe(true);
    expect(re.test("/uk/salary-calculator")).toBe(true);
    expect(re.test("/api/health")).toBe(false);
    expect(re.test("/_next/static/a.js")).toBe(false);
    expect(re.test("/favicon.ico")).toBe(false);
  });

  it("sets same-origin resource policy on api routes", async () => {
    const rules = (await nextConfig.headers?.()) ?? [];
    const api = rules.find((r) => r.source === "/api/:path*");
    expect(api?.headers).toContainEqual({
      key: "Cross-Origin-Resource-Policy",
      value: "same-origin",
    });
  });
});
