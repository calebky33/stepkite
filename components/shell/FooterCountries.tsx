"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { COUNTRIES, COUNTRY_INFO } from "@/lib/countries";
import { Flag } from "./Flag";

/** How many countries show before the visitor asks for the full list. */
const SHORT_LIST = 6;

/**
 * The footer's country list. It starts short so the footer stays compact on a phone, and a
 * button shows the rest. Every link is in the HTML (the extras are only hidden), so search
 * engines and visitors without JavaScript still reach every market. The order is fixed, so
 * nothing moves after the page loads.
 */
export function FooterCountries({ linkClass }: { linkClass: string }) {
  const [showAll, setShowAll] = useState(false);
  const listId = useId();

  return (
    <div className="flex flex-col gap-1">
      <ul id={listId} className="grid grid-cols-2 gap-x-4">
        {COUNTRIES.map((code, index) => (
          <li key={code} className={index >= SHORT_LIST && !showAll ? "hidden" : "min-w-0"}>
            <Link
              href={`/${code}`}
              title={COUNTRY_INFO[code].name}
              className={`${linkClass} min-w-0 max-w-full gap-2`}
            >
              <Flag code={code} />
              <span className="truncate">{COUNTRY_INFO[code].shortName}</span>
            </Link>
          </li>
        ))}
      </ul>
      <button
        type="button"
        aria-expanded={showAll}
        aria-controls={listId}
        onClick={() => setShowAll((value) => !value)}
        className={`${linkClass} self-start font-medium text-ink-fg`}
      >
        {showAll ? "Show fewer countries" : `Show all ${COUNTRIES.length} countries`}
      </button>
    </div>
  );
}
