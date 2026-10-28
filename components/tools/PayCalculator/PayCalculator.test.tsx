import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EngineOutcome } from "@/lib/tax/types";
import { PayCalculator } from "./PayCalculator";

const engine = vi.hoisted(() => ({ outcome: null as EngineOutcome | null }));

vi.mock("@/lib/tax", () => ({
  getRates: () => ({ taxYear: "2026-27", loaded: false, officialSources: [] }),
  getEngine: () => () =>
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
  it("shows an honest state and no net figure while rates are missing", () => {
    render(<PayCalculator country="uk" initialGross={30000} />);
    expect(screen.getByRole("textbox", { name: "Salary before tax" })).toBeTruthy();
    expect(screen.getByText(/£30,000/)).toBeTruthy();
    expect(screen.getByText(/checked against the official source/)).toBeTruthy();
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

  it("follows typing after the debounce", async () => {
    render(<PayCalculator country="us" initialGross={60000} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Salary before taxes" }), {
      target: { value: "75000" },
    });
    await waitFor(() => expect(screen.getByText(/\$75,000/)).toBeTruthy());
  });

  it("renders the breakdown table when an engine is ready", () => {
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
    expect(screen.getByRole("table", { name: /Breakdown/ })).toBeTruthy();
    expect(screen.getByText("Income tax")).toBeTruthy();
    expect(screen.getByText(/You take home £29,000 a year/)).toBeTruthy();
  });
});
