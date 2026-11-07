"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import type { PlanCode } from "@/lib/billing/plans";

/**
 * Starts a Paystack checkout. The server decides the price, so this only names the plan. A signed
 * out visitor is sent to sign in and comes back here. The only redirect target accepted is
 * Paystack's hosted checkout.
 */

const CHECKOUT_HOST = "checkout.paystack.com";

const responseSchema = z.object({
  authorization_url: z.url().optional(),
  error: z.string().optional(),
});

const MESSAGES: Record<string, string> = {
  already_subscribed: "You already have a plan. Manage it on your account page.",
  rate_limited: "Too many tries. Wait a minute and try again.",
  not_available_yet: "Payments are not open yet. Try again soon.",
};
const FALLBACK = "Checkout did not start. Try again in a minute.";

export function CheckoutButton({
  plan,
  label,
}: {
  plan: Exclude<PlanCode, "free">;
  label: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/paywall/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (res.status === 401) {
        router.push("/sign-in?next=/pricing");
        return;
      }
      const parsed = responseSchema.safeParse(await res.json().catch(() => null));
      const url = parsed.success ? parsed.data.authorization_url : undefined;
      if (res.ok && url && new URL(url).hostname === CHECKOUT_HOST) {
        window.location.assign(url);
        return;
      }
      const code = parsed.success ? parsed.data.error : undefined;
      setMessage((code && MESSAGES[code]) || FALLBACK);
    } catch {
      setMessage(FALLBACK);
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <Button variant="secondary" loading={busy} onClick={start}>
        {busy ? "Opening checkout" : label}
      </Button>
      <p role="status" className="min-h-5 text-sm text-muted">
        {message}
      </p>
    </div>
  );
}
