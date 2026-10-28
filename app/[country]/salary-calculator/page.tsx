import type { Metadata } from "next";
import { AdSlot } from "@/components/shell/AdSlot";
import { PayCalculator } from "@/components/tools/PayCalculator/PayCalculator";
import { ToolLinks } from "@/components/tools/ToolLinks";
import { COUNTRY_INFO } from "@/lib/countries";
import { countryParams, requireCountry, type CountryParams } from "@/lib/routes";
import { stubMetadata } from "@/lib/seo";

type Props = { params: Promise<CountryParams> };

export const dynamicParams = false;

export function generateStaticParams() {
  return countryParams();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const country = await requireCountry(params);
  const term = COUNTRY_INFO[country].takeHomeTerm;
  return stubMetadata({
    title: `Salary calculator: ${term}`,
    description: `Work out your ${term}.`,
  });
}

export default async function SalaryCalculatorPage({ params }: Props) {
  const country = await requireCountry(params);
  const info = COUNTRY_INFO[country];
  return (
    <>
      <h1 className="font-display text-4xl font-extrabold">Salary calculator for {info.name}</h1>
      <PayCalculator country={country} />
      <AdSlot placement="calculator" />
      <ToolLinks country={country} />
    </>
  );
}
