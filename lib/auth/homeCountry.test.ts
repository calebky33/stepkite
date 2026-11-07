import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { homeCountryRedirect } from "@/lib/routes";
import { saveHomeCountryIfMissing, setHomeCountry } from "./homeCountry";
import { homeCountry } from "./session";

function fakeSupabase(metadata: Record<string, unknown>, updateError: unknown = null) {
  const updateUser = vi.fn().mockResolvedValue({ error: updateError });
  const client = {
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: { user_metadata: metadata } }, error: null }),
      updateUser,
    },
  } as unknown as SupabaseClient;
  return { client, updateUser };
}

const geo = (iso?: string) => new Headers(iso ? { "cf-ipcountry": iso } : {});

describe("homeCountry", () => {
  it("trusts only registry codes from user_metadata", () => {
    expect(homeCountry({ home_country: "de" })).toBe("de");
    expect(homeCountry({ home_country: "fr" })).toBeNull();
    expect(homeCountry({ home_country: 42 })).toBeNull();
    expect(homeCountry(null)).toBeNull();
  });
});

describe("saveHomeCountryIfMissing", () => {
  it("never overwrites an existing choice", async () => {
    const { client, updateUser } = fakeSupabase({ home_country: "in" });
    expect(await saveHomeCountryIfMissing(client, "de", geo("KE"))).toBe("in");
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("prefers the sign-up choice over location", async () => {
    const { client, updateUser } = fakeSupabase({});
    expect(await saveHomeCountryIfMissing(client, "de", geo("KE"))).toBe("de");
    expect(updateUser).toHaveBeenCalledWith({ data: { home_country: "de" } });
  });

  it("falls back to location, and ignores a tampered choice", async () => {
    const { client, updateUser } = fakeSupabase({});
    expect(await saveHomeCountryIfMissing(client, "zz", geo("GB"))).toBe("uk");
    expect(updateUser).toHaveBeenCalledWith({ data: { home_country: "uk" } });
  });

  it("saves nothing without a choice or a known location", async () => {
    const { client, updateUser } = fakeSupabase({});
    expect(await saveHomeCountryIfMissing(client, null, geo("XX"))).toBeNull();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("reports null when the write fails", async () => {
    const { client } = fakeSupabase({}, { message: "down" });
    expect(await saveHomeCountryIfMissing(client, "ae", geo())).toBeNull();
    expect(await setHomeCountry(client, "ae")).toBe(false);
  });
});

describe("homeCountryRedirect", () => {
  it("sends another market's page to the same page in the home market", () => {
    expect(homeCountryRedirect("/uk/cv", "de")).toBe("/de/cv");
    expect(homeCountryRedirect("/uk/salary-calculator", "de")).toBe("/de");
    expect(homeCountryRedirect("/us/salary-calculator", "uk")).toBe("/uk/salary-calculator");
    expect(homeCountryRedirect("/us", "in")).toBe("/in");
  });

  it("leaves the home market and non-market pages alone", () => {
    expect(homeCountryRedirect("/de/cv", "de")).toBeNull();
    expect(homeCountryRedirect("/account", "de")).toBeNull();
    expect(homeCountryRedirect("/guides/x", "de")).toBeNull();
    expect(homeCountryRedirect("/", "de")).toBeNull();
  });
});
