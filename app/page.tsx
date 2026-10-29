import { AdSlot } from "@/components/shell/AdSlot";
import { PageShell } from "@/components/shell/PageShell";
import { HomeCalculator } from "@/components/tools/PayCalculator/HomeCalculator";
import { stubMetadata } from "@/lib/seo";

export const metadata = stubMetadata({
  title: "Take-home pay calculator",
  description:
    "Type your salary and see what lands in your bank. Pay calculators for the UK, the US and India.",
});

export default function Home() {
  return (
    <PageShell
      title="Work out your take-home pay"
      lead="Type your salary. The result updates as you type, and nothing you enter leaves your device."
    >
      <div className="flex flex-col gap-12">
        <HomeCalculator />
        <AdSlot placement="calculator" />
      </div>
    </PageShell>
  );
}
