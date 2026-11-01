import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { PlanCode } from "@/lib/billing/plans";

export type CurrentPlan = {
  plan: PlanCode | null;
  /** Amount in whole units of the currency on the next charge. Null when nothing is scheduled. */
  nextChargeAmount: string | null;
  /** ISO date of the next charge. Null when nothing is scheduled, for example on Lifetime. */
  nextChargeDate: string | null;
};

type Props = {
  /** For now this always comes from a mock. Once Supabase lands the account page reads the
   *  signed-in user's entitlement row and passes the shape in here. */
  state?: CurrentPlan;
};

/**
 * Shows the signed-in Pro user's current plan at the top of the pricing and account pages, with
 * the next charge amount, next charge date and a one-click Cancel button. Returns null when
 * there is no active plan, so anonymous visitors and Free users see nothing above the cards.
 *
 * See docs/MONETIZATION.md (Pages we add or refresh) and docs/RULES.md rules 12 and 17.
 */
export function CurrentPlanPanel({
  state = { plan: null, nextChargeAmount: null, nextChargeDate: null },
}: Props) {
  if (!state.plan) return null;
  const prettyDate = state.nextChargeDate
    ? new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(new Date(state.nextChargeDate))
    : null;
  return (
    <Card className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted">Your plan</h2>
        <p className="text-xl font-semibold text-text">{planLabel(state.plan)}</p>
        {state.nextChargeAmount && prettyDate ? (
          <p className="text-base text-muted">
            Next charge {state.nextChargeAmount} on {prettyDate}.
          </p>
        ) : (
          <p className="text-base text-muted">No charges are scheduled.</p>
        )}
      </div>
      <Button variant="secondary" className="self-start md:self-auto">
        Cancel plan
      </Button>
    </Card>
  );
}

function planLabel(code: PlanCode): string {
  if (code === "monthly") return "Monthly plan";
  if (code === "yearly") return "Yearly plan";
  if (code === "lifetime") return "Lifetime";
  return "Free";
}
