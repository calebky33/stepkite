import { existsSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { COUNTRIES } from "@/lib/countries";
import { countryRoutes } from "@/lib/routes";
import CountryHubPage, { generateStaticParams } from "./page";

const appDir = join(process.cwd(), "app", "[country]");

/** Maps /uk/salary/30000 to the page file that serves it. */
function pageFileFor(path: string): string {
  const [, , ...rest] = path.split("/");
  const segments = rest.map((segment, index) => {
    if (rest[index - 1] === "salary") return "[amount]";
    if (rest[index - 1] === "guides") return "[slug]";
    return segment;
  });
  return join(appDir, ...segments, "page.tsx");
}

async function renderHub(country: string) {
  render(await CountryHubPage({ params: Promise.resolve({ country }) }));
}

describe("country hub", () => {
  it("builds one page per country", () => {
    expect(generateStaticParams().map((p) => p.country)).toEqual([...COUNTRIES]);
  });

  it.each(COUNTRIES)("has one h1 and links to every tool for %s", async (country) => {
    await renderHub(country);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    for (const path of countryRoutes(country)) expect(hrefs).toContain(path);
    expect(hrefs.every((h) => h?.startsWith(`/${country}/`))).toBe(true);
  });

  it("shows the regime compare for India only", async () => {
    await renderHub("in");
    expect(screen.getByRole("link", { name: /tax regime/i })).toBeTruthy();
  });

  it("leaves the regime compare off the UK hub", async () => {
    await renderHub("uk");
    expect(screen.queryByRole("link", { name: /tax regime/i })).toBeNull();
  });

  it("uses local words", async () => {
    await renderHub("us");
    expect(screen.getByRole("link", { name: "Build your resume" })).toBeTruthy();
  });

  it.each(COUNTRIES)("only lists routes that have a page file for %s", (country) => {
    for (const path of countryRoutes(country)) {
      expect(existsSync(pageFileFor(path)), path).toBe(true);
    }
  });
});
