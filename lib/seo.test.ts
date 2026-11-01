import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { INDEXABLE_PATHS, SITE_URL, STUB_ROBOTS, stubMetadata } from "./seo";

describe("seo", () => {
  it("marks stub pages noindex", () => {
    expect(stubMetadata({ title: "Test" }).robots).toEqual(STUB_ROBOTS);
    expect(STUB_ROBOTS).toMatchObject({ index: false });
  });

  it("keeps stub routes out of the sitemap", () => {
    // Finished tool pages: UK calculator and its salary-level breakdowns, plus the three
    // launch guides. US and India calculators stay out until the owner reviews each state.
    const finishedPrefixes = ["/uk/salary-calculator", "/guides/"];
    const urls = sitemap()
      .map((entry) => entry.url)
      .filter((url) => !finishedPrefixes.some((pref) => url.includes(pref)));
    expect(sitemap().map((entry) => entry.url)).toContain(`${SITE_URL}/uk/salary-calculator`);
    // The /{country}/cv, /{country}/tracker and /{country}/compare routes are gated or stub.
    for (const stub of ["/cv", "/tracker", "/compare"]) {
      expect(urls.some((url) => url.endsWith(stub))).toBe(false);
    }
    // No country-prefixed URL slips through in the non-finished slice.
    for (const country of ["uk", "us", "in"]) {
      expect(urls.some((url) => url.includes(`/${country}`))).toBe(false);
    }
    // The guides index itself is a finished page.
    expect(sitemap().map((entry) => entry.url)).toContain(`${SITE_URL}/guides`);
    // The homepage carries the finished platform introduction, so it is indexable.
    expect(INDEXABLE_PATHS).toContain("/");
    expect(urls).toContain(SITE_URL);
    // Draft legal pages stay out until they are final.
    for (const draft of ["/privacy", "/terms", "/cookies"]) {
      expect(INDEXABLE_PATHS).not.toContain(draft);
    }
  });
});
