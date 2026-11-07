import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/geo/route";
import { countryFromIso, countryFromRequest } from "./geo";

describe("countryFromIso", () => {
  it("maps GB to uk and keeps other registry codes", () => {
    expect(countryFromIso("GB")).toBe("uk");
    expect(countryFromIso("DE")).toBe("de");
    expect(countryFromIso("in")).toBe("in");
  });

  it("gives null for unknown, Tor, missing and non-registry codes", () => {
    expect(countryFromIso("XX")).toBeNull();
    expect(countryFromIso("T1")).toBeNull();
    expect(countryFromIso("FR")).toBeNull();
    expect(countryFromIso("UK")).toBe("uk");
    expect(countryFromIso("")).toBeNull();
    expect(countryFromIso(null)).toBeNull();
  });
});

describe("countryFromRequest and /api/geo", () => {
  it("reads cf-ipcountry", () => {
    expect(countryFromRequest(new Headers({ "cf-ipcountry": "KE" }))).toBe("ke");
    expect(countryFromRequest(new Headers())).toBeNull();
  });

  it("returns the country and is never cached", async () => {
    const res = GET(new Request("https://x.test/api/geo", { headers: { "cf-ipcountry": "AE" } }));
    expect(await res.json()).toEqual({ country: "ae" });
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  });
});
