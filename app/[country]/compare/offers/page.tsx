import type { Metadata } from "next";
import { OfferCompare } from "@/components/tools/compare/OfferCompare";
import { TaxUnavailable } from "@/components/tools/TaxUnavailable";
import { COUNTRY_INFO, isTaxCountry } from "@/lib/countries";
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
  const tax = isTaxCountry(country);
  return stubMetadata({
    title: tax ? `Compare two job offers in ${name}` : `Offer comparison for ${name}`,
    description: tax
      ? `Put two ${name} salaries side by side after tax.`
      : `Comparing offers after tax is not available for ${name} yet.`,
    alternates: { canonical: `${SITE_URL}/${country}/compare/offers` },
  });
}

export default async function OfferComparePage({ params }: Props) {
  const country = await requireCountry(params);
  if (!isTaxCountry(country)) return <TaxUnavailable country={country} />;
  return (
    <>
      <h1 className="font-display text-4xl">Compare two job offers</h1>
      <p className="max-w-prose text-muted">
        Enter both salaries to see which one leaves you more after tax.
      </p>
      <OfferCompare country={country} />
    </>
  );
}
