import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { INDEXABLE_PATHS, SITE_URL, STUB_ROBOTS, stubMetadata } from "./seo";

describe("seo", () => {
  it("marks stub pages noindex", () => {
    expect(stubMetadata({ title: "Test" }).robots).toEqual(STUB_ROBOTS);
    expect(STUB_ROBOTS).toMatchObject({ index: false });
  });

  it("keeps stub routes out of the sitemap", () => {
    const urls = sitemap().map((entry) => entry.url);
    for (const stub of [
      "/salary",
      "/salary-calculator",
      "/cv",
      "/tracker",
      "/guides",
      "/compare",
    ]) {
      expect(urls.some((url) => url.includes(stub))).toBe(false);
    }
    for (const country of ["uk", "us", "in"]) {
      expect(urls.some((url) => url.includes(`/${country}`))).toBe(false);
    }
    expect(urls).toHaveLength(INDEXABLE_PATHS.length);
    // The homepage carries the finished platform introduction, so it is indexable.
    expect(INDEXABLE_PATHS).toContain("/");
    expect(urls).toContain(SITE_URL);
    // Draft legal pages stay out until they are final.
    for (const draft of ["/privacy", "/terms", "/cookies"]) {
      expect(INDEXABLE_PATHS).not.toContain(draft);
    }
  });
});
