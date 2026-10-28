import type { Metadata } from "next";
import { OfferCompare } from "@/components/tools/compare/OfferCompare";
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
    title: `Compare two job offers in ${name}`,
    description: `Put two ${name} salaries side by side after tax.`,
    alternates: { canonical: `${SITE_URL}/${country}/compare/offers` },
  });
}

export default async function OfferComparePage({ params }: Props) {
  const country = await requireCountry(params);
  return (
    <>
      <h1 className="font-display text-4xl font-extrabold">Compare two job offers</h1>
      <p className="max-w-prose text-muted">
        Enter both salaries to see which one leaves you more after tax.
      </p>
      <OfferCompare country={country} />
    </>
  );
}
