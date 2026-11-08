import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createSupabaseServer: vi.fn() }));
vi.mock("@/lib/rateLimit", () => ({ rateLimit: vi.fn().mockResolvedValue(true) }));
vi.mock("@/lib/auth/homeCountry", () => ({ saveHomeCountryIfMissing: vi.fn().mockResolvedValue("us") }));

import { saveHomeCountryIfMissing } from "@/lib/auth/homeCountry";
import { rateLimit } from "@/lib/rateLimit";
import { createSupabaseServer } from "@/lib/supabase/server";
import { POST } from "./route";

const url = "https://stepkite.example/api/auth/signin";
const sameOrigin = "https://stepkite.example";
const good = { email: "person@example.com", password: "correct horse" };

function post(body: unknown, origin: string | null = sameOrigin): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (origin) headers.origin = origin;
  return new Request(url, { method: "POST", headers, body: JSON.stringify(body) });
}

function withSignIn(result: unknown) {
  const signInWithPassword = vi.fn().mockResolvedValue(result);
  (createSupabaseServer as Mock).mockResolvedValue({ auth: { signInWithPassword } });
  return signInWithPassword;
}

describe("POST /api/auth/signin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (rateLimit as Mock).mockResolvedValue(true);
  });

  it("rejects a missing origin before touching Supabase", async () => {
    const res = await POST(post(good, null));
    expect(res.status).toBe(403);
    expect(createSupabaseServer).not.toHaveBeenCalled();
  });

  it("rejects a foreign origin", async () => {
    expect((await POST(post(good, "https://evil.example"))).status).toBe(403);
  });

  it("returns 429 when the auth rate limit is hit", async () => {
    (rateLimit as Mock).mockResolvedValueOnce(false);
    const res = await POST(post(good));
    expect(res.status).toBe(429);
    expect(createSupabaseServer).not.toHaveBeenCalled();
  });

  it("returns 400 for a bad body", async () => {
    expect((await POST(post({ email: "nope", password: "x" }))).status).toBe(400);
    expect((await POST(post({ email: "a@b.co" }))).status).toBe(400);
    expect((await POST(post({ ...good, extra: 1 }))).status).toBe(400);
  });

  it("returns 503 when Supabase is not configured", async () => {
    (createSupabaseServer as Mock).mockResolvedValue(null);
    const res = await POST(post(good));
    expect(res.status).toBe(503);
  });

  it("signs in and fills the home country", async () => {
    const signIn = withSignIn({ error: null });
    const res = await POST(post(good));
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.json()).toEqual({ signedIn: true });
    expect(signIn).toHaveBeenCalledWith({
      email: "person@example.com",
      password: "correct horse",
    });
    expect(saveHomeCountryIfMissing).toHaveBeenCalledWith(
      expect.anything(),
      null,
      expect.any(Headers),
    );
  });

  it("gives one answer for a wrong email or a wrong password", async () => {
    withSignIn({ error: { code: "invalid_credentials", status: 400 } });
    const res = await POST(post(good));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "invalid_credentials" });
    expect(saveHomeCountryIfMissing).not.toHaveBeenCalled();
  });

  it("treats a bare 400 as a credential failure, not a provider fault", async () => {
    withSignIn({ error: { status: 400 } });
    expect((await POST(post(good))).status).toBe(401);
  });

  it("reports an unconfirmed address so the user can act on it", async () => {
    withSignIn({ error: { code: "email_not_confirmed", status: 400 } });
    const res = await POST(post(good));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "email_not_confirmed" });
  });

  it("maps an upstream rate limit to 429", async () => {
    withSignIn({ error: { code: "over_request_rate_limit", status: 429 } });
    expect((await POST(post(good))).status).toBe(429);
  });

  it("returns 502 for an unknown provider error", async () => {
    withSignIn({ error: { code: "unexpected_failure", status: 500, message: "db down" } });
    const res = await POST(post(good));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "signin_failed" });
  });

  it("returns 502 when the provider throws", async () => {
    const signIn = vi.fn().mockRejectedValue(new Error("network"));
    (createSupabaseServer as Mock).mockResolvedValue({ auth: { signInWithPassword: signIn } });
    expect((await POST(post(good))).status).toBe(502);
  });
});
