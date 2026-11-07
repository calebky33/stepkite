import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CurrentPlanPanel } from "@/components/billing/CurrentPlanPanel";
import { PLANS } from "@/lib/billing/plans";
import { PricingCards } from "./PricingCards";
import Pricing from "./page";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

afterEach(() => {
  vi.restoreAllMocks();
  push.mockClear();
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

  it("gives each paid plan a Choose button and no link", () => {
    render(<PricingCards />);
    for (const name of ["Choose Monthly", "Choose Yearly", "Choose Lifetime"]) {
      expect(screen.getByRole("button", { name })).toBeTruthy();
      expect(screen.queryByRole("link", { name })).toBeNull();
    }
  });

  it("sends a signed out visitor to sign in and back to pricing", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ error: "sign_in_required" }, { status: 401 }),
    );
    render(<PricingCards />);
    fireEvent.click(screen.getByRole("button", { name: "Choose Monthly" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/sign-in?next=/pricing"));
  });

  it("names the chosen plan to the server and nothing else", async () => {
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json({ error: "already_subscribed" }, { status: 409 }));
    render(<PricingCards />);
    fireEvent.click(screen.getByRole("button", { name: "Choose Yearly" }));
    await waitFor(() => expect(spy).toHaveBeenCalled());
    const [url, init] = spy.mock.calls[0] ?? [];
    expect(url).toBe("/api/paywall/checkout");
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({ plan: "yearly" });
  });

  it("explains a refusal and lets the visitor try again", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ error: "already_subscribed" }, { status: 409 }),
    );
    render(<PricingCards />);
    const button = screen.getByRole("button", { name: "Choose Monthly" });
    fireEvent.click(button);
    expect((await screen.findAllByText(/already have a plan/))[0]).toBeTruthy();
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
  });

  it("shows a plain message when the request fails or the link is not Paystack", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    render(<PricingCards />);
    const button = screen.getByRole("button", { name: "Choose Monthly" });
    fireEvent.click(button);
    expect((await screen.findAllByText(/didn't start/))[0]).toBeTruthy();
    for (const [index, link] of [
      "https://evil.example/pay",
      "http://checkout.paystack.com/x",
    ].entries()) {
      fetchSpy.mockResolvedValue(Response.json({ authorization_url: link }));
      fireEvent.click(button);
      await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(index + 2));
      expect((await screen.findAllByText(/didn't start/))[0]).toBeTruthy();
    }
  });

  it("gives the Free card a sign-up note rather than a link", () => {
    render(<PricingCards />);
    expect(screen.queryByRole("link", { name: "Choose Free" })).toBeNull();
    expect(screen.getByText("Nothing to pay. Sign up to save your work.")).toBeTruthy();
  });

  it("does not reach the network until a plan is chosen", () => {
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
