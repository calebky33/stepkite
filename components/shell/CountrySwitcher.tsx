"use client";

import { usePathname } from "next/navigation";
import { COUNTRIES, COUNTRY_SHORT_NAME, isCountry } from "@/lib/countries";
import { pathForCountry, saveCountry, useSavedCountry } from "@/lib/countryPreference";
import { Flag } from "./Flag";
import { ToolsMenu } from "./ToolsMenu";

const BUTTON_CLASS =
  "inline-flex min-h-11 items-center rounded-input px-3 text-base font-medium transition-colors duration-150 ease-[var(--ease-out)]";

/**
 * One dropdown for the country. Choosing one remembers it on this device and opens the same
 * page in that country when it exists, else the country hub. The links are real links.
 */
export function CountrySwitcher({
  layout = "popover",
  onNavigate,
}: {
  layout?: "popover" | "inline";
  onNavigate?: () => void;
}) {
  const pathname = usePathname() ?? "/";
  const saved = useSavedCountry();
  const first = pathname.split("/")[1] ?? "";
  const active = isCountry(first) ? first : saved;

  const links = COUNTRIES.map((code) => ({
    href: pathForCountry(pathname, code),
    onSelect: () => saveCountry(code),
    label: (
      <span className="inline-flex items-center gap-2">
        <Flag code={code} />
        {COUNTRY_SHORT_NAME[code]}
      </span>
    ),
  }));
  const current = pathForCountry(pathname, active);

  return (
    <ToolsMenu
      layout={layout}
      links={links}
      current={current}
      pathname={pathname}
      active={false}
      onNavigate={onNavigate}
      buttonLabel={`Country, ${COUNTRY_SHORT_NAME[active]}`}
      trigger={
        <span className="inline-flex items-center gap-2">
          <Flag code={active} />
          {COUNTRY_SHORT_NAME[active]}
        </span>
      }
      className={BUTTON_CLASS}
    />
  );
}
