import { describe, expect, it, vi } from "vitest";
import {
  cleanText,
  createRateGuard,
  decodeEntities,
  extractDetails,
  extractDetailsWithSource,
  fetchPreview,
  isBlockedHost,
  parseSafeUrl,
} from "./preview";

const html = (body: string, headers: Record<string, string> = {}) =>
  new Response(body, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8", ...headers },
  });

describe("isBlockedHost (more)", () => {
  it("blocks the own host and subdomains but not lookalikes", () => {
    expect(isBlockedHost("stepkite.com", "stepkite.com")).toBe(true);
    expect(isBlockedHost("www.stepkite.com", "stepkite.com")).toBe(true);
    expect(isBlockedHost("evilstepkite.com", "stepkite.com")).toBe(false);
    expect(isBlockedHost("stepkite.com.", "stepkite.com")).toBe(true);
  });
  it("handles a trailing dot and IPv6 forms", () => {
    expect(isBlockedHost("example.com.")).toBe(false);
    expect(isBlockedHost("localhost.")).toBe(true);
    expect(isBlockedHost("[::1]")).toBe(true);
    expect(isBlockedHost("::1")).toBe(true);
    expect(isBlockedHost("2001:db8::1")).toBe(true);
  });
  it.each([
    "a.workers.dev",
    "10.0.0.1.sslip.io",
    "router.home.arpa",
    "a_b.example.com",
    "bücher.de",
    "a..b.com",
    "1.2.3.4",
    "2130706433.1",
    "example.0x7f",
    "example.123",
  ])("blocks %s", (host) => {
    expect(isBlockedHost(host)).toBe(true);
  });
  it("allows ordinary names, even with a letter-digit last label", () => {
    expect(isBlockedHost("example.com")).toBe(false);
    expect(isBlockedHost("jobs.example.x1")).toBe(false);
  });
});

describe("parseSafeUrl (redirect forms)", () => {
  it("resolves a relative redirect against its base", () => {
    expect(parseSafeUrl("/jobs/2", "https://example.com/a/b")?.href).toBe(
      "https://example.com/jobs/2",
    );
  });
  it("refuses http, credentials, and ports", () => {
    expect(parseSafeUrl("http://example.com/x", "https://example.com/")).toBeNull();
    expect(parseSafeUrl("https://u:p@example.com/", "https://example.com/")).toBeNull();
    expect(parseSafeUrl("https://example.com:8443/", "https://example.com/")).toBeNull();
    expect(parseSafeUrl("https://example.com:443/")?.hostname).toBe("example.com");
  });
  it("refuses a Location over 2000 characters", () => {
    expect(parseSafeUrl("/" + "a".repeat(2000), "https://example.com/")).toBeNull();
  });
});

describe("decodeEntities and cleanText (more)", () => {
  it("replaces control characters, surrogates and out of range code points", () => {
    expect(decodeEntities("a&#1;b")).toBe("a b");
    expect(decodeEntities("a&#xD800;b")).toBe("a b");
    expect(decodeEntities("a&#x110000;b")).toBe("a b");
    expect(decodeEntities("a&#99999999999;b")).toBe("a b");
  });
  it("decodes hex, named and case-insensitive entities", () => {
    expect(decodeEntities("&#x41;&#66;&AMP;")).toBe("AB&");
    expect(decodeEntities("a&nbsp;b")).toMatch(/^a\sb$/);
    expect(decodeEntities("a&ndash;b")).toBe("a-b");
    expect(decodeEntities("&unknown;")).toBe("&unknown;");
  });
  it("returns undefined for blank input and turns &#10; into a space", () => {
    expect(cleanText("")).toBeUndefined();
    expect(cleanText(" \n\t ")).toBeUndefined();
    expect(cleanText("a&#10;b")).toBe("a b");
  });
});

describe("page parsing through extractDetailsWithSource", () => {
  const og = (attrs: string) => `<head><meta ${attrs}></head>`;
  it("reads unquoted and unterminated attribute values", () => {
    expect(extractDetailsWithSource(og("property=og:title content=Plain")).title).toBe("Plain");
    expect(extractDetailsWithSource(og('property="og:title" content="Oops')).title).toBe("Oops");
  });
  it("ignores very long attribute names", () => {
    const long = "x".repeat(41);
    expect(extractDetailsWithSource(og(`${long}="1" property="og:title" content="T"`)).title).toBe(
      "T",
    );
  });
  it("accepts name or property, preferring property", () => {
    expect(extractDetailsWithSource(og('name="og:title" content="N"')).title).toBe("N");
    expect(extractDetailsWithSource(og('name="x" property="og:title" content="P"')).title).toBe(
      "P",
    );
  });
  it("falls back to the title tag when og content is empty", () => {
    const page = `<head><meta property="og:title" content=""><title>Tag</title></head>`;
    expect(extractDetailsWithSource(page)).toMatchObject({ title: "Tag", titleSource: "title" });
  });
  it("skips metadata and titlefoo tags", () => {
    expect(
      extractDetailsWithSource('<metadata property="og:title" content="X">').title,
    ).toBeUndefined();
    expect(extractDetailsWithSource("<titlefoo>Bad</titlefoo><title>Good</title>").title).toBe(
      "Good",
    );
  });
  it("stops looking after 200 meta tags", () => {
    const junk = '<meta name="a" content="b">'.repeat(199);
    const target = '<meta property="og:title" content="Found">';
    expect(extractDetailsWithSource(junk + target).title).toBe("Found");
    expect(extractDetailsWithSource(junk + "<meta name=z>" + target).title).toBeUndefined();
  });
  it("returns nothing for a title with no closing tag", () => {
    expect(extractDetailsWithSource("<title>Oops").title).toBeUndefined();
  });
  it("only scans up to the head end and the first 128 KB", () => {
    expect(extractDetailsWithSource("<head></HEAD><title>Late</title>").title).toBeUndefined();
    const pad = "<!--" + "x".repeat(100_000) + "-->";
    expect(extractDetailsWithSource(pad + "<title>Near</title>").title).toBe("Near");
    const far = "<!--" + "x".repeat(140_000) + "-->";
    expect(extractDetailsWithSource(far + "<title>Far</title>").title).toBeUndefined();
  });
});

describe("JSON-LD edge cases", () => {
  const ld = (o: unknown) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`;
  it("reads an @type array and an @graph", () => {
    expect(extractDetails(ld({ "@type": ["Thing", "JobPosting"], title: "Arr" })).title).toBe(
      "Arr",
    );
    expect(
      extractDetails(ld({ "@graph": [{ "@type": "JobPosting", title: "Graph" }] })).title,
    ).toBe("Graph");
  });
  it("stops at depth 6", () => {
    const nest = (depth: number): unknown =>
      depth === 0 ? { "@type": "JobPosting", title: "Deep" } : { "@graph": nest(depth - 1) };
    expect(extractDetails(ld(nest(6))).title).toBe("Deep");
    expect(extractDetails(ld(nest(7))).title).toBeUndefined();
  });
  it("accepts a company given as a string, and a company with no title", () => {
    const r = extractDetailsWithSource(ld({ "@type": "JobPosting", hiringOrganization: "Acme" }));
    expect(r).toEqual({ company: "Acme" });
  });
  it("uses og when the JSON-LD title is empty or not a string", () => {
    const og = '<head><meta property="og:title" content="OG"></head>';
    expect(extractDetailsWithSource(og + ld({ "@type": "JobPosting", title: "" }))).toMatchObject({
      title: "OG",
      titleSource: "og",
    });
    expect(extractDetailsWithSource(og + ld({ "@type": "JobPosting", title: 5 })).titleSource).toBe(
      "og",
    );
  });
  it("falls through to the next block when the first has no posting", () => {
    const page = ld({ "@type": "Organization" }) + ld({ "@type": "JobPosting", title: "Second" });
    expect(extractDetails(page).title).toBe("Second");
  });
  it("reads at most 20 script blocks", () => {
    const junk = ld({ "@type": "Other" });
    const post = ld({ "@type": "JobPosting", title: "P" });
    expect(extractDetails(junk.repeat(19) + post).title).toBe("P");
    expect(extractDetails(junk.repeat(20) + post).title).toBeUndefined();
  });
});

describe("fetchPreview (more)", () => {
  const redirect = (location?: string, status = 302) =>
    new Response(null, { status, headers: location ? { location } : {} });

  it("fails on a redirect with no Location", async () => {
    const r = await fetchPreview("https://example.com/a", { fetchImpl: async () => redirect() });
    expect(r).toEqual({ ok: false, reason: "fetch-failed" });
  });
  it("allows exactly MAX_HOPS redirects, not one more", async () => {
    const make = (redirects: number) => {
      let n = 0;
      return async () => (n++ < redirects ? redirect("/next") : html("<title>Done</title>"));
    };
    expect(await fetchPreview("https://example.com/a", { fetchImpl: make(3) })).toMatchObject({
      ok: true,
      title: "Done",
    });
    expect(await fetchPreview("https://example.com/a", { fetchImpl: make(4) })).toEqual({
      ok: false,
      reason: "fetch-failed",
    });
  });
  it("resolves a relative Location and blocks a redirect to the own host", async () => {
    const seen: string[] = [];
    const impl = async (u: string) => {
      seen.push(u);
      return seen.length === 1 ? redirect("/job/2") : html("<title>T</title>");
    };
    await fetchPreview("https://example.com/job/1", { fetchImpl: impl });
    expect(seen).toEqual(["https://example.com/job/1", "https://example.com/job/2"]);
    const self = await fetchPreview("https://example.com/a", {
      selfHost: "stepkite.com",
      fetchImpl: async () => redirect("https://stepkite.com/x"),
    });
    expect(self).toEqual({ ok: false, reason: "blocked" });
  });
  it("still returns details from a truncated body", async () => {
    const body = "<title>Early</title>" + "x".repeat(600 * 1024);
    const r = await fetchPreview("https://example.com/a", { fetchImpl: async () => html(body) });
    expect(r).toMatchObject({ ok: true, title: "Early" });
  });
  it("reports timeout when the body read is aborted", async () => {
    const impl = async (_u: string, init?: RequestInit) => {
      const stream = new ReadableStream<Uint8Array>({
        start(c) {
          init?.signal?.addEventListener("abort", () =>
            c.error(new DOMException("aborted", "AbortError")),
          );
        },
      });
      return new Response(stream, { status: 200, headers: { "content-type": "text/html" } });
    };
    const r = await fetchPreview("https://example.com/a", { fetchImpl: impl, timeoutMs: 20 });
    expect(r).toEqual({ ok: false, reason: "timeout" });
  });
  it("handles a null body and a non-numeric content-length", async () => {
    const empty = await fetchPreview("https://example.com/a", {
      fetchImpl: async () =>
        new Response(null, { status: 200, headers: { "content-type": "text/html" } }),
    });
    expect(empty).toEqual({ ok: false, reason: "no-details" });
    const odd = await fetchPreview("https://example.com/a", {
      fetchImpl: async () => html("<title>Ok</title>", { "content-length": "abc" }),
    });
    expect(odd).toMatchObject({ ok: true, title: "Ok" });
  });
  it("sends the user agent and accept headers, no cookies, no auto redirects", async () => {
    const impl = vi.fn(async (...args: [string, RequestInit?]) => {
      void args;
      return html("<title>T</title>");
    });
    await fetchPreview("https://example.com/a", { fetchImpl: impl });
    const init = impl.mock.calls[0]?.[1];
    expect(init?.headers).toEqual({ "user-agent": "StepkiteJobPreview/1.0", accept: "text/html" });
    expect(init?.redirect).toBe("manual");
    expect(init?.credentials).toBe("omit");
  });
  it("uses one timer across all hops", async () => {
    const spy = vi.spyOn(globalThis, "setTimeout");
    let n = 0;
    await fetchPreview("https://example.com/a", {
      timeoutMs: 4321,
      fetchImpl: async () => (n++ < 2 ? redirect("/n") : html("<title>T</title>")),
    });
    expect(spy.mock.calls.filter((c) => c[1] === 4321)).toHaveLength(1);
    spy.mockRestore();
  });
});

describe("createRateGuard (boundary)", () => {
  it("counts past the limit and resets exactly at the window edge", () => {
    let t = 1000;
    const guard = createRateGuard(2, 100, () => t);
    expect([guard(), guard(), guard(), guard()]).toEqual([true, true, false, false]);
    t = 1099;
    expect(guard()).toBe(false);
    t = 1100;
    expect(guard()).toBe(true);
  });
});
