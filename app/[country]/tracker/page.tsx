import type { Metadata } from "next";
import { TrackerShell } from "@/components/tools/tracker/TrackerShell";
import { countryParams, requireCountry, type CountryParams } from "@/lib/routes";
import { stubMetadata } from "@/lib/seo";

type Props = { params: Promise<CountryParams> };

export const dynamicParams = false;

export function generateStaticParams() {
  return countryParams();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await requireCountry(params);
  return stubMetadata({
    title: "Job tracker",
    description: "Keep track of every job you apply for, on your own device.",
  });
}

export default async function TrackerPage({ params }: Props) {
  await requireCountry(params);
  return (
    <>
      <h1 className="font-display text-4xl font-extrabold">Track your applications</h1>
      <p className="max-w-prose text-muted">
        Your jobs are saved on this device. Nothing is sent to us.
      </p>
      <TrackerShell />
    </>
  );
}
