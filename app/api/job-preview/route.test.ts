import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGIN = "https://stepkite.test";

async function load() {
  vi.resetModules();
  return import("./route");
}

function post(body: BodyInit | null, headers: Record<string, string> = {}): Request {
  return new Request(`${ORIGIN}/api/job-preview`, {
    method: "POST",
    headers: { origin: ORIGIN, "content-type": "application/json", ...headers },
    body,
    ...(body instanceof ReadableStream ? { duplex: "half" } : {}),
  } as RequestInit);
}

const link = (url: string) => JSON.stringify({ url });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("job-preview route", () => {
  it("refuses a foreign origin with 403", async () => {
    const { POST } = await load();
    const res = await POST(post(link("https://example.com/"), { origin: "https://evil.test" }));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ ok: false, reason: "forbidden" });
  });

  it("returns 400 for bad json and bad shape", async () => {
    const { POST } = await load();
    expect((await POST(post("{nope"))).status).toBe(400);
    expect((await POST(post(JSON.stringify({ url: 1 })))).status).toBe(400);
  });

  it("returns 422 blocked for a private address", async () => {
    const { POST } = await load();
    const res = await POST(post(link("https://127.0.0.1/")));
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ ok: false, reason: "blocked" });
  });

  it("returns 413 for a declared oversize body", async () => {
    const { POST } = await load();
    const res = await POST(post(link("https://example.com/"), { "content-length": "9000" }));
    expect(res.status).toBe(413);
  });

  it("returns 413 when a streamed body overruns the cap", async () => {
    const { POST } = await load();
    const chunk = new TextEncoder().encode("a".repeat(3000));
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(chunk);
      },
    });
    const res = await POST(post(stream));
    expect(res.status).toBe(413);
    expect(((await res.json()) as { ok: boolean }).ok).toBe(false);
  });

  it("returns read-failed when the request stream errors", async () => {
    const { POST } = await load();
    const stream = new ReadableStream<Uint8Array>({
      pull() {
        throw new Error("boom");
      },
    });
    const res = await POST(post(stream));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, reason: "read-failed" });
  });

  it.each([
    [404, 422, "not-found"],
    [403, 422, "blocked-by-site"],
    [500, 502, "fetch-failed"],
  ])("maps a target %i to %i %s", async (target, status, reason) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("x", { status: target })));
    const { POST } = await load();
    const res = await POST(post(link("https://example.com/")));
    expect(res.status).toBe(status);
    expect(await res.json()).toEqual({ ok: false, reason });
  });

  it("maps not-html and no-details to 422", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response("{}", { headers: { "content-type": "application/json" } }),
        )
        .mockResolvedValueOnce(
          new Response("<p>x</p>", { headers: { "content-type": "text/html" } }),
        ),
    );
    const { POST } = await load();
    expect((await POST(post(link("https://example.com/")))).status).toBe(422);
    const second = await POST(post(link("https://example.com/")));
    expect(second.status).toBe(422);
    expect(await second.json()).toEqual({ ok: false, reason: "no-details" });
  });

  it("maps a target stream overrun to 422", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("a".repeat(600 * 1024), { headers: { "content-type": "text/html" } }),
        ),
    );
    const { POST } = await load();
    expect((await POST(post(link("https://example.com/")))).status).toBe(422);
  });

  it("returns 200 with the title source", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("<title>Nurse</title>", { headers: { "content-type": "text/html" } }),
        ),
    );
    const { POST } = await load();
    const res = await POST(post(link("https://example.com/")));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, title: "Nurse", titleSource: "title" });
  });

  it("returns 429 with Retry-After once the limit is hit", async () => {
    const { POST } = await load();
    let last: Response | undefined;
    for (let i = 0; i < 61; i += 1) last = await POST(post("{nope"));
    expect(last?.status).toBe(429);
    expect(last?.headers.get("retry-after")).toBe("60");
  });

  it("turns an unexpected throw into a JSON 502", async () => {
    vi.doMock("@/lib/tracker/preview", async (orig) => ({
      ...(await orig<typeof import("@/lib/tracker/preview")>()),
      fetchPreview: () => {
        throw new Error("secret https://x.test");
      },
    }));
    const { POST } = await load();
    const res = await POST(post(link("https://example.com/")));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ ok: false, reason: "fetch-failed" });
    vi.doUnmock("@/lib/tracker/preview");
  });
});
