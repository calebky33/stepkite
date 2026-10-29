import type { Metadata } from "next";
import { MatchShell } from "@/components/tools/match/MatchShell";
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
  const info = COUNTRY_INFO[country];
  return stubMetadata({
    title: `Match your ${info.cvName} to a job ad in ${info.name}`,
    description: `See which parts of a job ad your ${info.cvName} already covers.`,
    alternates: { canonical: `${SITE_URL}/${country}/match` },
  });
}

export default async function MatchPage({ params }: Props) {
  const country = await requireCountry(params);
  const cv = COUNTRY_INFO[country].cvName;
  return (
    <>
      <h1 className="font-display text-4xl">Match your {cv} to a job ad</h1>
      <p className="max-w-prose text-muted">
        Paste a job ad to see what it asks for and which lines of your {cv} already show it. You
        approve every change.
      </p>
      <MatchShell country={country} />
    </>
  );
}
