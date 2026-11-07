# Review: m1-country-registry, commits 0e703a8..4af6f8b (2026-11-07)

Reviewer: Claude (independent, read-only). Implementer: Pi.
Reviewers run: typescript-reviewer, react-reviewer, database-reviewer, plus my own pass.
Build, lint, typecheck and check:copy are still running. Their results will follow in a separate commit.

Overall: sound. No tier 2 route reaches tax code: `loadEngine` returns null, `requireRates` throws,
`[gross]` returns a 404 on empty levels, and metadata is noindex for tier 2. No critical security problems.

## Fix before merge

1. HIGH (all reviewers). `app/[country]/page.tsx:74-79`: the "Open the salary calculator" button is
   unconditional. On the 20 tier 2 hubs it leads to the "not available" page.
   Fix: render it only when `info.tier === 1`. For tier 2, the main button goes to `/${country}/cv`,
   labelled "Build your {cvLabelTitle(country)}".

2. HIGH. `app/[country]/salary-calculator/page.tsx:~73`: `<AdSlot>` sits beside `TaxUnavailable` on an
   empty page. AdSense rejects ads on low-value pages. Fix: remove the AdSlot from that branch. Also
   check that `ToolLinks` hides tax tools (offers, regime) for tier 2.

3. MEDIUM (react-reviewer marks it BLOCKING). `components/tools/PayCalculator/PayCalculator.tsx:138-139`:
   `if (!Fields) return null` sits between hooks. Any hook added below it breaks the rules of hooks,
   and if a page guard is ever missed the page goes blank with no error. The same applies to the
   invented fallbacks `DEFAULT_VALUES[country] ?? {}`, `SLIDER_YEARLY ?? {max:150_000}` and `COPY?.label ?? ...`.
   Fix: add `type TaxCountry = "uk" | "us" | "in"`, type the `PayCalculator` prop and the
   `FIELDS`/`SLIDER_YEARLY`/`COPY`/`DEFAULT_VALUES` maps with it as full `Record`s, and delete the early return and the fallbacks.

4. MEDIUM. `lib/countries.ts`: `CountryCode = string` and `COUNTRY_INFO: Record<string, CountryInfo>`
   mean `COUNTRY_INFO[x]` is typed as always defined. It is safe today only because `isCountry` or
   `requireCountry` runs first, for example `salary-calculator/[gross]/page.tsx:46,72` and `compare/offers/page.tsx:18`.
   Fix: brand the type (`type CountryCode = string & { readonly __brand: "CountryCode" }`, make
   `isCountry` the type guard and have `requireCountry` return it), or derive a literal union from
   `COUNTRY_LIST as const`. Use `TaxCountry` (item 3) for `loadEngine` and `requireRates`, so a wrong call becomes a compile error.

## Should fix

5. MEDIUM. `components/shell/Flag.tsx:36-42`: the fallback badge hard-codes `#e5e7eb` and `#4b5563`. It
   glares in dark mode and the text is about 9px. Use design tokens (`var(--surface-2)` and `var(--muted)`), keep
   contrast at 4.5:1 or better, and keep `aria-hidden` on the svg.
6. LOW. `lib/cv/rules/index.ts` `defaultCvRules`: `spelling: "en-GB"` for every tier 2 market. Derive it from
   `info.locale` (CA to en-CA, PH to en-US). A tier 1 market missing from `rules` would also silently get these defaults.
7. LOW. `components/tools/TaxUnavailable.tsx`: the button text says `cvLabelTitle` while the paragraph says
   `info.cvName`. Add a tracker link too.
8. LOW. `components/tools/cv/templates/index.ts`: tier 2 gets the US templates. Check that the templates
   read `rules.paper`, so A4 markets do not export Letter. Not verified.
9. LOW. `components/shell/ConsentBanner.tsx:16`: treat the `ie`, `nl`, `de` and `se` routes like `uk`.

## Migration (database-reviewer)

`supabase/migrations/20261108000000_widen_profiles_country.sql`. The constraint name is correct and RLS is unaffected.
- Use `drop constraint if exists`.
- Add `set local lock_timeout = '5s';`, then `add constraint ... not valid;` and
  `validate constraint profiles_country_check;` so writes are not blocked.
- The comment says ISO 3166-1, but `uk` is not ISO (that is `gb`). Reword it to "two-letter registry code".
- No app code writes `profiles.country` yet. When sync is built, validate with `isCountry()` before writing.
- There is no rollback. Document that reverting needs `update ... set country = null where country not in ('uk','us','in')` first.

## Opportunities

- No tier 2 page is indexable. Add per-country CV guide pages (ca, au, ae, sg) to `INDEXABLE_PATHS`.
- On tier 2 hubs the CV upgrade is the only paid route. Make it the main call to action.

## Tests

- Vitest (og, lib/cv, PayCalculator): 172 of 172 passed. `tsc --noEmit`: clean (run on the earlier uncommitted state).
- Build, lint and check:copy at 4af6f8b: pending, to follow.

## Resolution (2026-11-07)

The owner asked Claude to take over Pi's uncommitted fixes and close the review.
- `879d064`: items 1 to 6 and 9 plus migration hardening. Typecheck, lint and check:copy clean,
  757 of 757 tests passed, build passed (228 pages).
- Follow-up commit: item 7 (TaxUnavailable and the tier 2 hub button use the `cvName` wording,
  and a tracker link is added). Migration validation now runs in its own transaction, with the ISO
  comment fixed and rollback documented. 278 of 278 tests passed in app/[country] and components/tools.
- Item 8: no change needed. Export (`PdfDownload` to `rules.paper`) and preview (`info.paper`)
  take the paper size from the country.
- Flag badge text contrast: no change needed. The SVG is `aria-hidden` and the country name sits beside it.

Still open: the 375px and 1280px visual check in light and dark mode, the migration has not been
applied to Supabase, and nothing has been pushed. Before merge, run the `reviewer` agent and then `/ship-check`.

## Handback

Pi: reference item numbers in your fix commits, or add a reply section here.
