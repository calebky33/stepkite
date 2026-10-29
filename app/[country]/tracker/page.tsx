import type { Metadata } from "next";
import { TrackerShell } from "@/components/tools/tracker/TrackerShell";
import { COUNTRY_INFO } from "@/lib/countries";
import { countryParams, requireCountry, type CountryParams } from "@/lib/routes";
import { SITE_URL, stubMetadata } from "@/lib/seo";

type Props = { params: Promise<CountryParams> };

export const dynamicParams = false;

export function generateStaticParams() {
  return countryParams();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const country = await requireCountry(params);
  const name = COUNTRY_INFO[country].name;
  return stubMetadata({
    title: `Job tracker for ${name}`,
    description: `Keep track of every job you apply for in ${name}, on your own device.`,
    alternates: { canonical: `${SITE_URL}/${country}/tracker` },
  });
}

export default async function TrackerPage({ params }: Props) {
  await requireCountry(params);
  return (
    <>
      <h1 className="font-display text-4xl">Track your applications</h1>
      <p className="max-w-prose text-muted">
        Your jobs are saved on this device. Nothing is sent to us.
      </p>
      <TrackerShell />
    </>
  );
}
