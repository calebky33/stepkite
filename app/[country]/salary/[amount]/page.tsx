import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PayCalculator } from "@/components/tools/PayCalculator/PayCalculator";
import { ToolLinks } from "@/components/tools/ToolLinks";
import { COUNTRIES, COUNTRY_INFO, formatMoney, isCountry } from "@/lib/countries";
import { stubMetadata } from "@/lib/seo";

type Params = { country: string; amount: string };
type Props = { params: Promise<Params> };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return COUNTRIES.flatMap((country) =>
    COUNTRY_INFO[country].salaryLevels.map((amount) => ({ country, amount: String(amount) })),
  );
}

async function resolve(params: Promise<Params>) {
  const { country, amount } = await params;
  if (!isCountry(country) || !/^\d+$/.test(amount)) notFound();
  const gross = Number(amount);
  if (!COUNTRY_INFO[country].salaryLevels.includes(gross)) notFound();
  return { country, gross };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { country, gross } = await resolve(params);
  const money = formatMoney(gross, country);
  return stubMetadata({
    title: `${money} salary: ${COUNTRY_INFO[country].takeHomeTerm}`,
    description: `Check what a ${money} salary leaves you after tax.`,
  });
}

export default async function SalaryAmountPage({ params }: Props) {
  const { country, gross } = await resolve(params);
  const info = COUNTRY_INFO[country];
  const money = formatMoney(gross, country);
  return (
    <>
      <h1 className="font-display text-4xl font-extrabold">
        What a {money} salary leaves you in {info.name}
      </h1>
      <p className="max-w-prose text-muted">
        The full breakdown for {money} arrives with the official rates. Until then, change the
        figure below to try your own.
      </p>
      <PayCalculator country={country} initialGross={gross} />
      <ToolLinks country={country} />
    </>
  );
}
