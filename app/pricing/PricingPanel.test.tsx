import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PricingPanel } from "./PricingPanel";
import { PricingTable } from "./PricingTable";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PricingPanel", () => {
  it("shows the planned price and a disabled button, and never calls the network", () => {
    vi.spyOn(globalThis, "fetch");
    render(<PricingPanel />);
    expect(screen.getByText("£6")).toBeTruthy();
    expect(screen.getByText("Planned price")).toBeTruthy();
    const button = screen.getByRole("button", { name: "Pro Pass opens soon" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(screen.getByRole("radio", { name: "US" }));
    expect(screen.getByText("$7")).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "India" }));
    expect(screen.getByText("₹299")).toBeTruthy();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

describe("PricingTable", () => {
  it("compares free and Pro with a named table", () => {
    render(<PricingTable />);
    const table = screen.getByRole("table", { name: "Free and Pro features" });
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((c) => c.textContent),
    ).toEqual(["Feature", "Free", "Pro Pass"]);
    const matching = within(table).getByRole("row", { name: /Job ad matching/ });
    expect(within(matching).getByText("1 a month")).toBeTruthy();
    expect(within(matching).getByText("Unlimited")).toBeTruthy();
    expect(screen.getAllByText("Being built").length).toBeGreaterThan(0);
  });
});
