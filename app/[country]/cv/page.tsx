import type { Metadata } from "next";
import { CvBuilderShell } from "@/components/tools/cv/CvBuilderShell";
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
  return stubMetadata({
    title: `${COUNTRY_INFO[country].cvName} builder for ${COUNTRY_INFO[country].name}`,
    description: `Write your ${COUNTRY_INFO[country].cvName} to ${COUNTRY_INFO[country].name} standards, on your own device.`,
    alternates: { canonical: `${SITE_URL}/${country}/cv` },
  });
}

export default async function CvPage({ params }: Props) {
  const country = await requireCountry(params);
  const doc = COUNTRY_INFO[country].cvName;
  return (
    <>
      <h1 className="font-display text-4xl">Build your {doc}</h1>
      <p className="max-w-prose text-muted">
        Your {doc} is saved on this device. Nothing is sent to us.
      </p>
      <CvBuilderShell key={country} country={country} />
    </>
  );
}
