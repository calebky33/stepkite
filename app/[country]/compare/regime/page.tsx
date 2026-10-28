import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RegimeCompare } from "@/components/tools/compare/RegimeCompare";
import { countryParams, requireCountry, type CountryParams } from "@/lib/routes";
import { SITE_URL, stubMetadata } from "@/lib/seo";

type Props = { params: Promise<CountryParams> };

export const dynamicParams = false;

/** Only India has two regimes. Other countries build no page here. */
export function generateStaticParams() {
  return countryParams().filter((p) => p.country === "in");
}

async function requireIndia(params: Promise<CountryParams>) {
  const country = await requireCountry(params);
  if (country !== "in") notFound();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await requireIndia(params);
  return stubMetadata({
    title: "Old regime or new regime in India",
    description: "Compare your in-hand salary under the old and new income tax regimes.",
    alternates: { canonical: `${SITE_URL}/in/compare/regime` },
  });
}

export default async function RegimeComparePage({ params }: Props) {
  await requireIndia(params);
  return (
    <>
      <h1 className="font-display text-4xl font-extrabold">Old regime or new regime</h1>
      <p className="max-w-prose text-muted">
        Enter your salary to see your in-hand pay under each regime.
      </p>
      <RegimeCompare />
    </>
  );
}
