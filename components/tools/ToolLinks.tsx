import Link from "next/link";
import { COUNTRY_INFO, type CountryCode } from "@/lib/countries";

/** Plain links to the other tools for a country. Server component, no client JS. */
export function ToolLinks({
  country,
  skip,
}: {
  country: CountryCode;
  skip?: "cv" | "tracker" | "match";
}) {
  const cv = COUNTRY_INFO[country].cvName;
  const linkClass =
    "inline-flex min-h-11 items-center text-base font-semibold text-primary underline underline-offset-4";
  return (
    <nav aria-label="More tools" className="flex flex-wrap gap-x-6 gap-y-1">
      {skip === "cv" ? null : (
        <Link href={`/${country}/cv`} className={linkClass}>
          Build your {cv}
        </Link>
      )}
      {skip === "tracker" ? null : (
        <Link href={`/${country}/tracker`} className={linkClass}>
          Track your applications
        </Link>
      )}
      {skip === "match" ? null : (
        <Link href={`/${country}/match`} className={linkClass}>
          Match your {cv} to a job ad
        </Link>
      )}
    </nav>
  );
}
