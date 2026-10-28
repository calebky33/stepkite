import { describe, expect, it } from "vitest";
import {
  CONSENT_COOKIE,
  needsConsentBanner,
  parseConsent,
  readConsentCookie,
  serializeConsent,
} from "./consent";

describe("consent", () => {
  it("asks in the UK and the EU, and when the location is unknown", () => {
    expect(needsConsentBanner("GB")).toBe(true);
    expect(needsConsentBanner("de")).toBe(true);
    expect(needsConsentBanner(null)).toBe(true);
  });

  it("does not ask in the US or India", () => {
    expect(needsConsentBanner("US")).toBe(false);
    expect(needsConsentBanner("IN")).toBe(false);
  });

  it("round trips a choice through the cookie string", () => {
    const cookie = serializeConsent({ analytics: true, ads: false }).split(";")[0];
    expect(readConsentCookie(`other=1; ${cookie}`)).toEqual({ analytics: true, ads: false });
    expect(cookie.startsWith(`${CONSENT_COOKIE}=`)).toBe(true);
  });

  it("ignores a broken or tampered cookie", () => {
    expect(parseConsent("not-json")).toBeNull();
    expect(parseConsent(encodeURIComponent(JSON.stringify({ analytics: "yes" })))).toBeNull();
    expect(parseConsent(undefined)).toBeNull();
  });
});
