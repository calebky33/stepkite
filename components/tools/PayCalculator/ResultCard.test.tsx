import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NetBar, ResultCard, type ResultState } from "./ResultCard";

vi.mock("@/lib/tax", () => ({
  getRates: () => ({
    taxYear: "2026",
    loaded: false,
    officialSources: ["https://www.gov.uk/income-tax-rates"],
  }),
}));

const ready: ResultState = {
  kind: "ready",
  taxYear: "2026",
  result: {
    gross: 24000,
    lines: [{ key: "tax", label: "Income tax", amount: 2400, source: "https://www.gov.uk/x" }],
    net: 21600,
    perPeriod: { year: 21600, month: 1800, week: 415 },
    assumptions: [],
  },
};

const base = {
  country: "uk",
  annualGross: 30000,
  entered: "£30,000 a year",
  example: true,
} as const;

describe("ResultCard", () => {
  it("says rates are not loaded, names the source and shows no amounts", () => {
    render(<ResultCard {...base} state={{ kind: "rates-missing" }} />);
    expect(screen.getByText("Estimate. Rates not loaded yet.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "www.gov.uk" }).getAttribute("href")).toBe(
      "https://www.gov.uk/income-tax-rates",
    );
    expect(screen.getAllByText("Pending")).toHaveLength(5);
    expect(screen.getByText("Placeholder, no figures yet")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Build a CV" }).getAttribute("href")).toBe("/uk/cv");
    expect(screen.getByRole("table").textContent).not.toMatch(/\d/);
    expect(document.querySelector('[aria-live="polite"]')).toBeTruthy();
  });

  it("shows the real breakdown, monthly first, and switches period", () => {
    render(<ResultCard {...base} state={ready} />);
    expect(screen.getByText(/You take home £1,800 a month/)).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "Year" }));
    expect(screen.getByText(/You take home £21,600 a year/)).toBeTruthy();
    expect(screen.getByRole("cell", { name: "£2,400" })).toBeTruthy();
  });

  it("highlights a table row when its arc is focused", () => {
    render(<ResultCard {...base} state={ready} />);
    fireEvent.focus(screen.getByRole("img", { name: /Income tax/ }));
    const row = screen.getByText("Income tax", { selector: "td" }).closest("tr");
    expect(row?.hasAttribute("data-selected")).toBe(true);
  });

  it("shows empty, invalid and error states", () => {
    const { rerender } = render(<ResultCard {...base} state={{ kind: "empty" }} />);
    expect(screen.getByText(/Type a salary/)).toBeTruthy();
    rerender(<ResultCard {...base} state={{ kind: "invalid" }} />);
    expect(screen.getByText(/Fix the salary/)).toBeTruthy();
    rerender(<ResultCard {...base} state={{ kind: "error" }} />);
    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it("shows a skeleton and no table while loading", () => {
    const { container } = render(<ResultCard {...base} state={{ kind: "loading" }} />);
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(5);
    expect(screen.queryByRole("table")).toBeNull();
  });
});

describe("NetBar", () => {
  it("is sticky, hidden on large screens, pads for the safe area and shows Pending", () => {
    render(<NetBar country="uk" state={{ kind: "rates-missing" }} />);
    const link = screen.getByRole("link", { name: /Pending/ });
    const classes = link.parentElement?.className ?? "";
    expect(classes).toContain("sticky");
    // Sits above the consent banner when it is showing (the banner publishes --consent-h).
    expect(classes).toContain("bottom-[var(--consent-h,0px)]");
    expect(classes).toContain("lg:hidden");
    expect(classes).toContain("env(safe-area-inset-bottom)");
    expect(link.className).toContain("min-h-11");
  });
});
