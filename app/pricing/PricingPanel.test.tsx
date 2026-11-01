import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CurrentPlanPanel } from "@/components/billing/CurrentPlanPanel";
import { PLANS } from "@/lib/billing/plans";
import { PricingCards } from "./PricingCards";
import Pricing from "./page";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PricingCards", () => {
  it("renders a card for every plan in docs/MONETIZATION.md", () => {
    render(<PricingCards />);
    for (const plan of PLANS) {
      expect(screen.getByRole("heading", { name: plan.name, level: 3 })).toBeTruthy();
    }
  });

  it("shows the exact prices from lib/billing/plans.ts", () => {
    render(<PricingCards />);
    // "Free" shows twice on the Free card (the heading and the price), so match both.
    expect(screen.getAllByText("Free").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("$9.99")).toBeTruthy();
    expect(screen.getByText("$39")).toBeTruthy();
    expect(screen.getByText("$149")).toBeTruthy();
  });

  it("labels paid plans with the cadence under the price", () => {
    render(<PricingCards />);
    expect(screen.getByText("per month")).toBeTruthy();
    expect(screen.getByText("per year")).toBeTruthy();
    expect(screen.getByText("one time")).toBeTruthy();
  });

  it("sends paid plans to sign-up with the pricing return path", () => {
    render(<PricingCards />);
    const monthly = screen.getByRole("link", { name: "Choose Monthly" }) as HTMLAnchorElement;
    expect(monthly.getAttribute("href")).toBe("/sign-up?next=/pricing");
    const yearly = screen.getByRole("link", { name: "Choose Yearly" }) as HTMLAnchorElement;
    expect(yearly.getAttribute("href")).toBe("/sign-up?next=/pricing");
    const lifetime = screen.getByRole("link", { name: "Choose Lifetime" }) as HTMLAnchorElement;
    expect(lifetime.getAttribute("href")).toBe("/sign-up?next=/pricing");
  });

  it("gives the Free card a sign-up note rather than a link", () => {
    render(<PricingCards />);
    expect(screen.queryByRole("link", { name: "Choose Free" })).toBeNull();
    expect(screen.getByText("Nothing to pay. Sign up to save your work.")).toBeTruthy();
  });

  it("does not reach the network", () => {
    const spy = vi.spyOn(globalThis, "fetch");
    render(<PricingCards />);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("CurrentPlanPanel", () => {
  it("renders nothing when the user has no active plan", () => {
    const { container } = render(<CurrentPlanPanel />);
    expect(container.firstChild).toBeNull();
  });

  it("shows the current plan with next charge and a Cancel button", () => {
    render(
      <CurrentPlanPanel
        state={{
          plan: "monthly",
          nextChargeAmount: "$9.99",
          nextChargeDate: "2026-12-01",
        }}
      />,
    );
    expect(screen.getByText("Monthly plan")).toBeTruthy();
    expect(screen.getByText(/Next charge \$9\.99 on December 1, 2026\./)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancel plan" })).toBeTruthy();
  });
});

describe("Pricing page", () => {
  it("shows the Start free trial CTA at the top and all four plan cards", () => {
    render(<Pricing />);
    const trial = screen.getByRole("region", { name: "Try Pro for seven days, no card" });
    const link = within(trial).getByRole("link", { name: "Start free trial" }) as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/sign-up?next=/pricing");
    for (const plan of PLANS) {
      expect(screen.getByRole("heading", { name: plan.name, level: 3 })).toBeTruthy();
    }
  });
});
