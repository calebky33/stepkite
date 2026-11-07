import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi, type MockInstance } from "vitest";
import type { Entitlement } from "@/lib/billing/entitlement";
import { BillingSummary } from "./BillingSummary";

const MONTHLY: Entitlement = {
  planCode: "monthly",
  status: "active",
  trialEndsAt: null,
  currentPeriodEnd: "2026-12-07T12:00:00.000Z",
  cancelAt: null,
  trialExportsToday: 0,
};

function mockFetch(
  entitlement: Entitlement,
  cancel?: () => Response | Promise<Response>,
): MockInstance<typeof fetch> {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url.includes("/api/billing/me")) return Response.json({ signedIn: true, entitlement });
    if (url.includes("/api/paywall/cancel") && cancel) return cancel();
    throw new Error(`unexpected fetch ${url}`);
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("BillingSummary cancel", () => {
  it("shows Cancel plan for a live monthly plan, with a confirm step", async () => {
    mockFetch(MONTHLY);
    render(<BillingSummary />);
    fireEvent.click(await screen.findByRole("button", { name: "Cancel plan" }));
    expect(screen.getByRole("button", { name: "Yes, cancel plan" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Keep plan" }));
    expect(screen.getByRole("button", { name: "Cancel plan" })).toBeTruthy();
  });

  it("moves focus to each next step and announces the result", async () => {
    mockFetch(MONTHLY, () =>
      Response.json({ status: "canceled", access_until: "2026-12-07T12:00:00.000Z" }),
    );
    render(<BillingSummary />);
    fireEvent.click(await screen.findByRole("button", { name: "Cancel plan" }));
    expect(document.activeElement?.textContent).toContain("Stop renewals?");
    fireEvent.click(screen.getByRole("button", { name: "Keep plan" }));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancel plan" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel plan" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, cancel plan" }));
    await screen.findByText(/Cancelled\. You keep Pro until/);
    await waitFor(() => expect(document.activeElement?.textContent).toContain("Cancelled."));
    expect(screen.getByRole("status").textContent).toBe(
      "Plan cancelled. You keep Pro until December 7, 2026.",
    );
  });

  it("cancels in one confirmed click and shows when access ends", async () => {
    const spy = mockFetch(MONTHLY, () =>
      Response.json({ status: "canceled", access_until: "2026-12-07T12:00:00.000Z" }),
    );
    render(<BillingSummary />);
    fireEvent.click(await screen.findByRole("button", { name: "Cancel plan" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, cancel plan" }));
    expect(await screen.findByText(/Cancelled\. You keep Pro until December 7, 2026/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Cancel plan" })).toBeNull();
    const cancelCall = spy.mock.calls.find(([url]) => String(url).includes("/api/paywall/cancel"));
    expect((cancelCall?.[1] as RequestInit).method).toBe("POST");
  });

  it("explains a failure and keeps the plan so the user can try again", async () => {
    mockFetch(MONTHLY, () => Response.json({ error: "provider_unavailable" }, { status: 502 }));
    render(<BillingSummary />);
    fireEvent.click(await screen.findByRole("button", { name: "Cancel plan" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, cancel plan" }));
    expect(await screen.findByText(/couldn't cancel your plan/)).toBeTruthy();
    await waitFor(() => expect(document.activeElement?.textContent).toContain("Stop renewals?"));
    await waitFor(() =>
      expect(
        (screen.getByRole("button", { name: "Yes, cancel plan" }) as HTMLButtonElement).disabled,
      ).toBe(false),
    );
    fireEvent.click(screen.getByRole("button", { name: "Keep plan" }));
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("shows no Cancel button for lifetime, a trial or an already cancelled plan", async () => {
    for (const entitlement of [
      { ...MONTHLY, planCode: "lifetime" as const },
      { ...MONTHLY, planCode: "trial" as const, status: "trialing" as const },
      { ...MONTHLY, cancelAt: "2026-12-07T12:00:00.000Z" },
    ]) {
      vi.restoreAllMocks();
      mockFetch(entitlement);
      const { unmount } = render(<BillingSummary />);
      await screen.findByText("Your plan");
      await waitFor(() => expect(screen.queryByText("Loading your plan.")).toBeNull());
      expect(screen.queryByRole("button", { name: "Cancel plan" })).toBeNull();
      if (entitlement.cancelAt) {
        expect(screen.getByText(/Cancelled\. You keep Pro until/)).toBeTruthy();
      }
      unmount();
    }
  });
});
