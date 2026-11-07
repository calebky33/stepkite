import { permanentRedirect } from "next/navigation";
import { COUNTRIES, COUNTRY_INFO, isCountry } from "@/lib/countries";
import { salaryLevelsFor } from "@/lib/salaryLevels";

type Params = { country: string; amount: string };
type Props = { params: Promise<Params> };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return COUNTRIES.flatMap((country) =>
    COUNTRY_INFO[country].salaryLevels.map((amount) => ({ country, amount: String(amount) })),
  );
}

/**
 * Legacy curated level pages. Replaced by /{country}/salary-calculator/{gross} and the generic
 * calculator with ?gross=. This page 308s to whichever target matches, so old bookmarks and
 * backlinks keep working.
 */
export default async function LegacySalaryPage({ params }: Props) {
  const { country, amount } = await params;
  if (!isCountry(country) || !/^\d+$/.test(amount)) permanentRedirect("/");
  const gross = Number(amount);
  const base = `/${country}/salary-calculator`;
  const target = salaryLevelsFor(country).includes(gross)
    ? `${base}/${gross}`
    : `${base}?gross=${gross}`;
  permanentRedirect(target);
}
