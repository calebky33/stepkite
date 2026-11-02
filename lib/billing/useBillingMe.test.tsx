import { act, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useBillingMe } from "./useBillingMe";

function Probe({ onState }: { onState: (state: ReturnType<typeof useBillingMe>) => void }) {
  const state = useBillingMe();
  onState(state);
  return null;
}

describe("useBillingMe", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("treats the free default from /api/billing/me as not Pro", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              signedIn: false,
              entitlement: null,
            }),
            { status: 200 },
          ),
        ),
      ),
    );
    const seen: ReturnType<typeof useBillingMe>[] = [];
    render(<Probe onState={(state) => seen.push(state)} />);
    await waitFor(() => expect(seen.at(-1)?.status).toBe("ready"));
    expect(seen.at(-1)?.isPro).toBe(false);
  });

  it("reports Pro for an active entitlement", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              signedIn: true,
              entitlement: {
                planCode: "yearly",
                status: "active",
                trialEndsAt: null,
                currentPeriodEnd: "2027-01-01T00:00:00.000Z",
                cancelAt: null,
                trialExportsToday: 0,
              },
            }),
            { status: 200 },
          ),
        ),
      ),
    );
    const seen: ReturnType<typeof useBillingMe>[] = [];
    render(<Probe onState={(state) => seen.push(state)} />);
    await waitFor(() => expect(seen.at(-1)?.status).toBe("ready"));
    expect(seen.at(-1)?.isPro).toBe(true);
  });

  it("falls back to not Pro when the API errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("boom", { status: 500 }))),
    );
    const seen: ReturnType<typeof useBillingMe>[] = [];
    render(<Probe onState={(state) => seen.push(state)} />);
    await waitFor(() => expect(seen.at(-1)?.status).toBe("error"));
    expect(seen.at(-1)?.isPro).toBe(false);
  });

  it("ignores an AbortError on unmount", async () => {
    const abortError = new DOMException("aborted", "AbortError");
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(abortError)),
    );
    const seen: ReturnType<typeof useBillingMe>[] = [];
    const { unmount } = render(<Probe onState={(state) => seen.push(state)} />);
    await act(async () => {
      unmount();
    });
    expect(seen.some((state) => state.status === "error")).toBe(false);
  });
});
