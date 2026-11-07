import { afterEach, describe, expect, it, vi } from "vitest";

async function sessionFor(metadata: unknown) {
  vi.resetModules();
  vi.doMock("@/lib/supabase/server", () => ({
    createSupabaseServer: async () => ({
      auth: {
        getUser: async () => ({
          data: {
            user: { id: "u1", email: "a@b.co", created_at: "2026-01-01", user_metadata: metadata },
          },
          error: null,
        }),
      },
    }),
  }));
  const { getSession } = await import("./session");
  return getSession();
}

afterEach(() => vi.doUnmock("@/lib/supabase/server"));

describe("getSession name", () => {
  it("reads the provider's full name, then falls back to name", async () => {
    expect((await sessionFor({ full_name: "Caleb Yegon", name: "C" }))?.name).toBe("Caleb Yegon");
    expect((await sessionFor({ name: "Caleb" }))?.name).toBe("Caleb");
  });

  it("tidies spaces and bounds the length", async () => {
    expect((await sessionFor({ full_name: "  Caleb \n  Yegon  " }))?.name).toBe("Caleb Yegon");
    expect((await sessionFor({ full_name: "x".repeat(200) }))?.name).toHaveLength(60);
  });

  it("returns null when there is no usable name", async () => {
    for (const metadata of [undefined, null, {}, { full_name: 5 }, { full_name: "   " }, "x"]) {
      expect((await sessionFor(metadata))?.name).toBeNull();
    }
  });
});
