"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { COUNTRIES, isCountry, type CountryCode } from "@/lib/countries";
import { cn } from "@/components/ui/cn";

const SHORT_NAME: Record<CountryCode, string> = { uk: "UK", us: "US", in: "India" };

/**
 * Plain links to the same page in another country. The pathname is known at build time
 * for static routes, so the links are in the HTML and work without JavaScript.
 */
export function CountrySwitcher({ className }: { className?: string }) {
  const pathname = usePathname() ?? "/";
  const [, first = "", ...rest] = pathname.split("/");
  const active = isCountry(first) ? first : null;
  const tail = active && rest.length > 0 ? `/${rest.join("/")}` : "";

  return (
    <nav aria-label="Country" className={className}>
      <ul className="flex gap-1">
        {COUNTRIES.map((code) => (
          <li key={code}>
            <Link
              href={`/${code}${tail}`}
              aria-current={code === active ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 min-w-11 items-center justify-center rounded-input px-3 text-base",
                "transition-colors duration-150 ease-[var(--ease-out)] hover:bg-surface-2",
                code === active ? "bg-accent-soft font-semibold text-text" : "text-muted",
              )}
            >
              {SHORT_NAME[code]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
