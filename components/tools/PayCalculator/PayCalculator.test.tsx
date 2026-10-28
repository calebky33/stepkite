import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EngineOutcome } from "@/lib/tax/types";
import { PayCalculator } from "./PayCalculator";

const engine = vi.hoisted(() => ({ outcome: null as EngineOutcome | null }));

vi.mock("@/lib/tax", () => ({
  getRates: () => ({
    taxYear: "2026",
    loaded: false,
    officialSources: ["https://www.gov.uk/income-tax-rates"],
  }),
  loadEngine: async () => () =>
    engine.outcome ?? {
      status: "rates-missing",
      country: "uk",
      reason: "Rates have not been checked yet.",
    },
}));

beforeEach(() => {
  engine.outcome = null;
});

describe("PayCalculator", () => {
  it("shows an honest state and no net figure while rates are missing", async () => {
    render(<PayCalculator country="uk" initialGross={30000} />);
    expect(screen.getByRole("textbox", { name: "Salary before tax" })).toBeTruthy();
    expect(await screen.findByText("Estimate. Rates not loaded yet.")).toBeTruthy();
    expect(screen.getByText(/£30,000 a year/)).toBeTruthy();
    expect(screen.getAllByText("Example").length).toBeGreaterThan(0);
    expect(screen.queryByText(/you take home/i)).toBeNull();
    expect(document.querySelector('[aria-live="polite"]')).toBeTruthy();
  });

  it("shows the range error for a salary of zero", () => {
    render(<PayCalculator country="uk" initialGross={30000} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Salary before tax" }), {
      target: { value: "0" },
    });
    expect(screen.getByRole("alert").textContent).toBe(
      "Enter a salary between £1 and £10,000,000.",
    );
  });

  it("follows typing after the debounce and drops the example mark", async () => {
    render(<PayCalculator country="us" initialGross={60000} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Salary before taxes" }), {
      target: { value: "75000" },
    });
    await waitFor(() => expect(screen.getByText(/\$75,000 a year/)).toBeTruthy());
    expect(screen.queryByText("Example")).toBeNull();
  });

  it("shows the old regime inputs for India only after choosing it", () => {
    render(<PayCalculator country="in" />);
    expect(screen.queryByText("Section 80C investments")).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: "Old regime" }));
    expect(screen.getByText("Section 80C investments")).toBeTruthy();
  });

  it("renders the breakdown table when an engine is ready", async () => {
    engine.outcome = {
      status: "ready",
      result: {
        gross: 30000,
        lines: [{ key: "tax", label: "Income tax", amount: 1000, source: "https://www.gov.uk/x" }],
        net: 29000,
        perPeriod: { year: 29000, month: 2417, week: 558 },
        assumptions: ["Example figures for a test."],
      },
    };
    render(<PayCalculator country="uk" initialGross={30000} />);
    expect(await screen.findByRole("table", { name: /Breakdown/ })).toBeTruthy();
    expect(screen.getByText("Income tax")).toBeTruthy();
    expect(screen.getByText(/You take home £2,417 a month/)).toBeTruthy();
  });
});
