import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createSupabaseServer: vi.fn() }));
vi.mock("@/lib/rateLimit", () => ({ rateLimit: vi.fn().mockResolvedValue(true) }));
vi.mock("@/lib/auth/homeCountry", () => ({ saveHomeCountryIfMissing: vi.fn().mockResolvedValue("uk") }));

import { saveHomeCountryIfMissing } from "@/lib/auth/homeCountry";
import { rateLimit } from "@/lib/rateLimit";
import { createSupabaseServer } from "@/lib/supabase/server";
import { POST } from "./route";

const url = "https://stepkite.example/api/auth/signup";
const sameOrigin = "https://stepkite.example";

function post(body: unknown, origin: string | null = sameOrigin): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (origin) headers.origin = origin;
  return new Request(url, { method: "POST", headers, body: JSON.stringify(body) });
}

const good = { email: "person@example.com", password: "correct horse", next: "/uk/cv" };

function withSignUp(result: unknown) {
  const signUp = vi.fn().mockResolvedValue(result);
  (createSupabaseServer as Mock).mockResolvedValue({ auth: { signUp } });
  return signUp;
}

describe("POST /api/auth/signup", () => {
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
    const res = await POST(post(good, "https://evil.example"));
    expect(res.status).toBe(403);
  });

  it("returns 429 when the auth rate limit is hit", async () => {
    (rateLimit as Mock).mockResolvedValueOnce(false);
    const res = await POST(post(good));
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: "rate_limited" });
    expect(createSupabaseServer).not.toHaveBeenCalled();
  });

  it("returns 400 for a body that fails the schema", async () => {
    expect((await POST(post({ email: "nope", password: "correct horse" }))).status).toBe(400);
    expect((await POST(post({ ...good, password: "short" }))).status).toBe(400);
    expect((await POST(post({ ...good, extra: "field" }))).status).toBe(400);
    expect((await POST(post({ ...good, country: "zz!" }))).status).toBe(400);
  });

  it("returns 400 when the body is not JSON", async () => {
    const request = new Request(url, {
      method: "POST",
      headers: { origin: sameOrigin, "Content-Type": "application/json" },
      body: "{",
    });
    const res = await POST(request);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid" });
  });

  it("returns 503 when Supabase is not configured", async () => {
    (createSupabaseServer as Mock).mockResolvedValue(null);
    const res = await POST(post(good));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "not_available" });
  });

  it("creates the account, passes the market, and stores the home country", async () => {
    const signUp = withSignUp({ data: { session: { access_token: "t" } }, error: null });
    const res = await POST(post({ ...good, country: "ca" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.json()).toEqual({ signedIn: true });
    expect(signUp).toHaveBeenCalledWith({
      email: "person@example.com",
      password: "correct horse",
      options: {
        emailRedirectTo: "https://stepkite.example/api/auth/callback?next=%2Fuk%2Fcv",
        data: { home_country: "ca" },
      },
    });
    expect(saveHomeCountryIfMissing).toHaveBeenCalledWith(
      expect.anything(),
      "ca",
      expect.any(Headers),
    );
  });

  it("sends no metadata when the form sent no market", async () => {
    const signUp = withSignUp({ data: { session: { access_token: "t" } }, error: null });
    await POST(post(good));
    expect(signUp.mock.calls[0][0].options.data).toBeUndefined();
  });

  it("asks for confirmation instead of redirecting when sign-up returns no session", async () => {
    withSignUp({ data: { session: null }, error: null });
    const res = await POST(post(good));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ confirmEmail: true });
    expect(saveHomeCountryIfMissing).not.toHaveBeenCalled();
  });

  it("keeps the next path inside the site", async () => {
    const signUp = withSignUp({ data: { session: null }, error: null });
    await POST(post({ ...good, next: "https://evil.example/steal" }));
    expect(signUp.mock.calls[0][0].options.emailRedirectTo).toBe(
      "https://stepkite.example/api/auth/callback?next=%2F",
    );
  });

  it.each([
    ["weak_password", 400, "password_too_weak"],
    ["email_exists", 400, "email_taken"],
    ["user_already_exists", 400, "email_taken"],
    ["over_email_send_rate_limit", 429, "rate_limited"],
  ])("maps the %s error to %s %s", async (code, status, error) => {
    withSignUp({ data: {}, error: { code, status } });
    const res = await POST(post(good));
    expect(res.status).toBe(status);
    expect(await res.json()).toEqual({ error });
  });

  it("returns 503 when sign-up is disabled", async () => {
    withSignUp({ data: {}, error: { code: "signup_disabled", status: 403 } });
    const res = await POST(post(good));
    expect(res.status).toBe(503);
  });

  it("returns 502 for an unknown provider error and does not repeat its message", async () => {
    withSignUp({ data: {}, error: { code: "unexpected_failure", status: 500, message: "db down" } });
    const res = await POST(post(good));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "signup_failed" });
  });

  it("returns 502 when the provider throws", async () => {
    const signUp = vi.fn().mockRejectedValue(new Error("network"));
    (createSupabaseServer as Mock).mockResolvedValue({ auth: { signUp } });
    const res = await POST(post(good));
    expect(res.status).toBe(502);
  });
});
