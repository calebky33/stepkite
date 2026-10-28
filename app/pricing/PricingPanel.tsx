"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { CountryCode } from "@/lib/countries";

type Plan = "pass" | "annual";
type Status =
  | { kind: "idle" }
  | { kind: "loading"; plan: Plan }
  | { kind: "message"; text: string; signIn?: boolean };

const PASS_PRICE: Record<CountryCode, string> = { uk: "£6", us: "$7", in: "₹299" };
/** Only the US annual price is set so far. */
const ANNUAL_PRICE: Partial<Record<CountryCode, string>> = { us: "$39" };

const INCLUDED = [
  "Match your CV to a job ad, and approve every line before it changes",
  "Tailored CV versions for each application",
  "Cover letters",
  "Extra CV templates",
  "Sync between your devices",
  "No ads",
];

export function PricingPanel() {
  const [country, setCountry] = useState<CountryCode>("uk");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const annual = ANNUAL_PRICE[country];

  const checkout = async (plan: Plan) => {
    setStatus({ kind: "loading", plan });
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country, plan }),
      });
      if (response.ok) {
        const body: unknown = await response.json().catch(() => null);
        const url =
          body && typeof body === "object" && "url" in body && typeof body.url === "string"
            ? body.url
            : null;
        if (url?.startsWith("https://checkout.stripe.com/")) {
          window.location.assign(url);
          return;
        }
        setStatus({
          kind: "message",
          text: "We couldn't open checkout. Nothing was charged. Try again.",
        });
        return;
      }
      if (response.status === 401) {
        setStatus({ kind: "message", text: "Sign in first, then come back to pay.", signIn: true });
      } else if (response.status === 503) {
        setStatus({
          kind: "message",
          text: "Checkout isn't open yet. Nothing was charged. Please check back later.",
        });
      } else {
        setStatus({
          kind: "message",
          text: "We couldn't open checkout. Nothing was charged. Try again.",
        });
      }
    } catch {
      setStatus({
        kind: "message",
        text: "We couldn't reach checkout. Check your connection and try again. Nothing was charged.",
      });
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[3fr_2fr] lg:items-start">
      <Card className="flex flex-col gap-6">
        <SegmentedControl<CountryCode>
          label="Country"
          value={country}
          onValueChange={setCountry}
          className="max-w-sm"
          options={[
            { value: "uk", label: "UK" },
            { value: "us", label: "US" },
            { value: "in", label: "India" },
          ]}
        />
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold">Pro Pass</h2>
          <p className="font-display text-5xl font-extrabold tabular-nums">{PASS_PRICE[country]}</p>
          <p className="text-base text-muted">
            One payment for 30 days. It never renews by itself.
          </p>
        </div>
        <Button
          loading={status.kind === "loading" && status.plan === "pass"}
          onClick={() => checkout("pass")}
          className="self-start"
        >
          Pay {PASS_PRICE[country]} for 30 days
        </Button>

        <div className="flex flex-col gap-2 border-t border-border pt-6">
          <h2 className="text-base font-semibold">Annual plan, if you prefer it</h2>
          {annual ? (
            <>
              <p className="text-base text-muted">
                {annual} a year. It renews every year until you cancel, and you can cancel from your
                account at any time.
              </p>
              <Button
                variant="secondary"
                loading={status.kind === "loading" && status.plan === "annual"}
                onClick={() => checkout("annual")}
                className="self-start"
              >
                Pay {annual} a year
              </Button>
            </>
          ) : (
            <p className="text-base text-muted">
              The annual price for this country isn&apos;t set yet.
            </p>
          )}
        </div>

        <div role="status" className="min-h-6 text-base">
          {status.kind === "message" ? (
            <p>
              {status.text}{" "}
              {status.signIn ? (
                <Link href="/sign-in" className="text-primary underline underline-offset-2">
                  Go to sign in
                </Link>
              ) : null}
            </p>
          ) : null}
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">What the Pass is for</h2>
        <ul className="list-disc pl-5 text-base">
          {INCLUDED.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="text-sm text-muted">
          These tools are still being built, and checkout opens when they are ready.
        </p>
      </Card>
    </div>
  );
}
