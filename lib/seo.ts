import type { Metadata } from "next";

/**
 * Pages with no real content yet. They get noindex and stay out of sitemap.ts
 * until the real content lands, so thin pages are never indexed.
 */
export const STUB_ROBOTS: NonNullable<Metadata["robots"]> = { index: false, follow: true };

export function stubMetadata(meta: Metadata): Metadata {
  return { ...meta, robots: STUB_ROBOTS };
}

export const SITE_URL = "https://stepkite.com";

/** Only pages with finished content. Add a route here in the same change that makes it real and removes its noindex. */
export const INDEXABLE_PATHS: readonly string[] = [
  "/about",
  "/contact",
  "/pricing",
  "/privacy",
  "/terms",
  "/cookies",
];
