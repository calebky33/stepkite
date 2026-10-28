import { PageShell } from "@/components/shell/PageShell";
import { PricingPanel } from "./PricingPanel";
import { PricingTable } from "./PricingTable";

import { SITE_URL } from "@/lib/seo";

export const metadata = {
  alternates: { canonical: `${SITE_URL}/pricing` },
  title: "Pricing",
  description:
    "The calculators and the basic CV are free. The Pro Pass is planned as one payment for 30 days and never renews by itself.",
};

export default function Pricing() {
  return (
    <PageShell
      title="Pricing"
      lead="The calculators and the basic CV are free, and they stay free."
    >
      <PricingPanel />
      <PricingTable />
    </PageShell>
  );
}
