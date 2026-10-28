import type { Metadata } from "next";
import { OfferCompare } from "@/components/tools/compare/OfferCompare";
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
    title: "Compare two job offers",
    description: "Put two salaries side by side after tax.",
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
