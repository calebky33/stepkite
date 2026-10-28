import { PageShell } from "@/components/shell/PageShell";
import { PricingPanel } from "./PricingPanel";

export const metadata = {
  title: "Pricing",
  description:
    "The calculators and the basic CV are free. The Pro Pass is one payment for 30 days and never renews by itself.",
};

export default function Pricing() {
  return (
    <PageShell
      title="Pricing"
      lead="The calculators and the basic CV are free, and they stay free."
    >
      <PricingPanel />
    </PageShell>
  );
}
