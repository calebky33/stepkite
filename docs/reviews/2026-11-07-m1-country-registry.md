# Review: m1-country-registry (uncommitted work, 2026-11-07)

Reviewer: Claude (independent, read-only). Implementer: Pi.
Scope: the 26 modified files plus `components/tools/TaxUnavailable.tsx` and
`supabase/migrations/20261108000000_widen_profiles_country.sql` in Pi's worktree.

Overall: sound. Tier 2 markets can never show a tax figure (`loadEngine` returns null,
`requireRates` throws, the pages are noindex). No critical security problems.

## Confirmed bugs (fix before merge)

1. MEDIUM. `app/[country]/page.tsx:74`: the "Open the salary calculator" button shows on every
   hub. On the 20 tier 2 markets it leads to the "not available" page.
   Fix: render it only when `info.tier === 1`. For tier 2, make the main button
   `/${country}/cv` with the label "Build your {cvLabelTitle(country)}".

2. MEDIUM. `lib/countries.ts:13,319`: `CountryCode = string` and
   `COUNTRY_INFO: Record<string, CountryInfo>` remove compile-time checks. `COUNTRY_INFO["gb"].name`
   compiles and then crashes when it runs.
   Fix: `const COUNTRY_LIST = [...] as const satisfies readonly CountryInfo[]`,
   `type CountryCode = (typeof COUNTRY_LIST)[number]["code"]`, and add
   `type TaxCountry = "uk" | "us" | "in"`. Type `loadEngine`, `requireRates`, `PayCalculator` props,
   `FIELDS`, `SLIDER_YEARLY`, `COPY` and `DEFAULT_VALUES` with `TaxCountry`. Then drop most of the
   `Partial<>` and `?? fallback` code.

3. LOW. `components/tools/PayCalculator/PayCalculator.tsx:139`: `if (!Fields) return null` gives a
   blank screen. The pages guard against it today, so it is latent. It goes away once item 2 is done.

## Recommendations

4. `app/[country]/salary-calculator/page.tsx:70-78`: remove `AdSlot` from the tier 2 "not available"
   branch. AdSense rejects ads on pages without publisher content.
5. `lib/cv/rules/index.ts` `defaultCvRules`: set `spelling` from `info.locale` (CA to en-CA, PH to en-US),
   not always en-GB.
6. `components/tools/cv/templates/index.ts`: tier 2 falls back to the US templates. Check that the
   templates read `rules.paper`, so A4 markets (de, nl, za, ae and others) do not export Letter. Not verified.
7. `components/shell/Flag.tsx` fallback: replace `#e5e7eb` and `#4b5563` with design tokens so it
   works in dark mode.
8. `components/shell/ConsentBanner.tsx:16`: treat the `ie`, `nl`, `de` and `se` routes like `uk`, for consistency.
9. Migration: the regex accepts any two letters (`xx`). Make sure the profile write path validates
   with `isCountry`. Run `database-reviewer` on the migration before merge (CLAUDE.md).

## Opportunities

- No tier 2 page is indexable. Add per-country CV guide pages for ca, au, ae and sg to
  `INDEXABLE_PATHS`. That is SEO gain without any tax work.
- On tier 2 hubs the CV upgrade is the only paid route. Make it the main call to action.

## Tests run (read-only, in Pi's worktree)

- `npx vitest run app/api/og lib/cv components/tools/PayCalculator`: 28 files, 172 tests passed.
- `npx tsc --noEmit --incremental false`: no errors.
- Not run: `pnpm build`, lint, `check:copy`, e2e, the 375px and 1280px visual checks.

## Handback

Pi, reply by adding a section to this file on the `claude-review` branch, or note fixes in your
commit messages with the item numbers.
