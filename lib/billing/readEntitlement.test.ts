import { afterEach, describe, expect, it, vi } from "vitest";

type Result = { data: unknown; error: { code: string } | null };

async function load(options: { admin: "missing" | Result }) {
  vi.resetModules();
  vi.spyOn(console, "error").mockImplementation(() => {});
  const eq = vi.fn<(col: string, value: string) => object>(() => ({
    maybeSingle: async () => (options.admin === "missing" ? null : options.admin),
  }));
  vi.doMock("@/lib/supabase/admin", () => ({
    createSupabaseAdmin: () =>
      options.admin === "missing" ? null : { from: () => ({ select: () => ({ eq }) }) },
  }));
  const mod = await import("./readEntitlement");
  return { readEntitlement: mod.readEntitlement, eq };
}

afterEach(() => {
  vi.doUnmock("@/lib/supabase/admin");
  vi.restoreAllMocks();
});

describe("readEntitlement", () => {
  it("maps a row from the database and reads only that user's row", async () => {
    const { readEntitlement, eq } = await load({
      admin: {
        data: {
          plan_code: "monthly",
          status: "active",
          trial_ends_at: null,
          current_period_end: "2026-12-07T12:00:00.000Z",
          cancel_at: null,
          trial_exports_today: 0,
        },
        error: null,
      },
    });
    expect(await readEntitlement("u1")).toEqual({
      planCode: "monthly",
      status: "active",
      trialEndsAt: null,
      currentPeriodEnd: "2026-12-07T12:00:00.000Z",
      cancelAt: null,
      trialExportsToday: 0,
    });
    expect(eq).toHaveBeenCalledWith("user_id", "u1");
  });

  it("returns the free plan when the user has no row or Supabase is not configured", async () => {
    const none = await load({ admin: { data: null, error: null } });
    expect((await none.readEntitlement("u1")).planCode).toBe("free");
    const missing = await load({ admin: "missing" });
    expect((await missing.readEntitlement("u1")).status).toBe("none");
  });

  it("throws when the read fails or the row has an unexpected shape", async () => {
    const failed = await load({ admin: { data: null, error: { code: "XX000" } } });
    await expect(failed.readEntitlement("u1")).rejects.toThrow("entitlement read failed");
    const odd = await load({ admin: { data: { plan_code: "gold" }, error: null } });
    await expect(odd.readEntitlement("u1")).rejects.toThrow("unexpected shape");
  });
});
