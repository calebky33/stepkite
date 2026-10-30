import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { emptyCv, type Cv } from "@/lib/cv/schema";
import { PagedPreview, scaleFor } from "./PagedPreview";

const NOW = "2026-01-01T00:00:00.000Z";

function worstCase(country: "uk" | "us" | "in"): Cv {
  const cv = emptyCv("x", country, NOW);
  return {
    ...cv,
    contact: {
      ...cv.contact,
      fullName: "Wolfeschlegelsteinhausenbergerdorff".repeat(3),
      email: "a".repeat(80) + "@example.com",
    },
    summary: "مرحبا بالعالم ".repeat(20),
    experience: Array.from({ length: 6 }, (_, j) => ({
      id: `job-${j}`,
      role: "Role",
      employer: "Employer",
      location: "",
      start: "2020-01",
      end: null,
      bullets: Array.from({ length: 12 }, (_b, i) => `Bullet ${i} ${"word ".repeat(30)}`),
    })),
    education: [],
    skills: [],
  };
}

describe("PagedPreview", () => {
  it("draws A4 pages for the UK and India, Letter for the US", () => {
    const sizes = (["uk", "us", "in"] as const).map((country) => {
      const { unmount } = render(
        <PagedPreview cv={emptyCv("x", country, NOW)} country={country} />,
      );
      const page = screen.getAllByRole("group", { name: /^Page 1 of/ })[0]!;
      const out = [page.dataset.paper, page.dataset.widthMm, page.dataset.heightMm];
      unmount();
      return out;
    });
    expect(sizes).toEqual([
      ["A4", "210", "297"],
      ["Letter", "215.9", "279.4"],
      ["A4", "210", "297"],
    ]);
  });

  it("labels the example when the CV is empty", () => {
    render(<PagedPreview cv={emptyCv("x", "uk", NOW)} country="uk" />);
    expect(screen.getByText(/^Example\./)).toBeTruthy();
    expect(screen.getByRole("region", { name: "CV preview" }).textContent).toContain("Sam Example");
  });

  it("splits a long CV across numbered pages without cutting a block", () => {
    render(<PagedPreview cv={worstCase("uk")} country="uk" />);
    const pages = screen.getAllByRole("group", { name: /^Page \d+ of \d+$/ });
    expect(pages.length).toBeGreaterThan(1);
    expect(pages[0]?.getAttribute("aria-label")).toBe(`Page 1 of ${pages.length}`);
    expect(screen.getByText(`Page ${pages.length} of ${pages.length}`)).toBeTruthy();
    const blocks = screen
      .getByRole("region", { name: "CV preview" })
      .querySelectorAll("[data-block]");
    expect(blocks.length).toBeGreaterThan(0);
    blocks.forEach((b) => {
      expect(b.className).toContain("break-inside-avoid");
      expect(b.className).toContain("overflow-wrap:anywhere");
    });
  });

  it("keeps real text, one column, and no images or tables", () => {
    render(<PagedPreview cv={worstCase("us")} country="us" />);
    const region = screen.getByRole("region", { name: "resume preview" });
    expect(region.querySelector("img, table, svg")).toBeNull();
    expect(region.textContent).toContain("مرحبا");
    expect(region.querySelector('[dir="auto"]')).not.toBeNull();
  });

  it("picks the page scale from the zoom setting", () => {
    expect(scaleFor("fit", 0.42)).toBe(0.42);
    expect(scaleFor("full", 0.42)).toBe(1);
  });

  it("switches between fit width and 100 percent, and makes the scroller reachable by keyboard", () => {
    render(<PagedPreview cv={emptyCv("x", "uk", NOW)} country="uk" />);
    const region = screen.getByRole("region", { name: "CV preview" });
    const sheet = () =>
      screen.getAllByRole("group", { name: /^Page 1 of/ })[0]!.firstElementChild as HTMLElement;
    expect(screen.getByRole("radio", { name: "Fit width" }).getAttribute("aria-checked")).toBe(
      "true",
    );
    expect(region.getAttribute("tabindex")).toBeNull();
    expect(sheet().style.transform).toBe("scale(0.5)");
    fireEvent.click(screen.getByRole("radio", { name: "100 percent" }));
    expect(sheet().style.transform).toBe("scale(1)");
    expect(region.getAttribute("tabindex")).toBe("0");
  });
});
