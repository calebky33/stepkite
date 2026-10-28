import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { INDEXABLE_PATHS, STUB_ROBOTS, stubMetadata } from "./seo";

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
    expect(urls).toHaveLength(INDEXABLE_PATHS.length);
  });
});
