import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createSupabaseServer: vi.fn() }));

import { createSupabaseServer } from "@/lib/supabase/server";
import { POST } from "./route";

const url = "https://stepkite.example/api/auth/signout";
const sameOrigin = "https://stepkite.example";

describe("POST /api/auth/signout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects when the origin header is missing", async () => {
    const res = await POST(new Request(url, { method: "POST" }));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "forbidden" });
    expect(createSupabaseServer).not.toHaveBeenCalled();
  });

  it("rejects when the origin header does not match", async () => {
    const res = await POST(
      new Request(url, { method: "POST", headers: { origin: "https://evil.example" } }),
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "forbidden" });
    expect(createSupabaseServer).not.toHaveBeenCalled();
  });

  it("returns 503 when Supabase is not configured", async () => {
    (createSupabaseServer as Mock).mockResolvedValue(null);
    const res = await POST(new Request(url, { method: "POST", headers: { origin: sameOrigin } }));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "not_available" });
  });

  it("calls supabase.auth.signOut once and returns 200", async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null });
    (createSupabaseServer as Mock).mockResolvedValue({ auth: { signOut } });
    const res = await POST(new Request(url, { method: "POST", headers: { origin: sameOrigin } }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(await res.json()).toEqual({ signedOut: true });
    expect(res.headers.get("Set-Cookie")).toMatch(/^sk_user=; Path=\/; Max-Age=0/);
  });

  it("returns 500 when supabase.auth.signOut returns an error", async () => {
    const signOut = vi.fn().mockResolvedValue({ error: { message: "boom" } });
    (createSupabaseServer as Mock).mockResolvedValue({ auth: { signOut } });
    const res = await POST(new Request(url, { method: "POST", headers: { origin: sameOrigin } }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "signout_failed" });
  });

  it("returns 500 when supabase.auth.signOut throws", async () => {
    const signOut = vi.fn().mockRejectedValue(new Error("network"));
    (createSupabaseServer as Mock).mockResolvedValue({ auth: { signOut } });
    const res = await POST(new Request(url, { method: "POST", headers: { origin: sameOrigin } }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "signout_failed" });
  });
});
