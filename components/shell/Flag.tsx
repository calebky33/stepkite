import type { CountryCode } from "@/lib/countries";

/**
 * Small flat flag for every market, served as a static SVG from public/flags (copied from the
 * MIT licensed country-flag-icons 1.6.20, see public/flags/LICENSE.txt). An image instead of
 * inline SVG keeps the flags out of the JavaScript bundle. Decorative: the country name always
 * sits beside it, so the alt text is empty.
 */
export function Flag({ code }: { code: CountryCode }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a 1 to 3 KB static SVG needs no next/image optimiser or its client code.
    <img
      src={`/flags/${code}.svg`}
      alt=""
      width={24}
      height={16}
      loading="lazy"
      decoding="async"
      className="h-4 w-6 shrink-0 rounded-[2px] object-cover shadow-[0_0_0_1px_var(--border)]"
    />
  );
}
