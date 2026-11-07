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

## Ship-check and merge (2026-11-07, later)

At the owner's request, Claude ran /ship-check, fixed the findings and merged.
- 93ab375: ship-check fixes. Registry drift test (lib/countries.test.ts), tier 2 metadata,
  hub button gated on isTaxCountry, flag tokens, a scrolling country menu, and TaxUnavailable copy.
- ab0a375: SECURITY FIX. The tracker sign-up gate in proxy.ts was hard-coded to uk, us and in, so
  the 20 tier 2 trackers were open to anonymous visitors. The gate is now built from COUNTRIES.
  E2E is split into an anonymous project and a signed-in project (CV list, import and tracker
  need E2E_EMAIL and E2E_PASSWORD for a test account). There are also visual fixes: the tier 2 hub
  uses one column, and the footer lists countries in two columns with new copy.
- 61a8dc2: e2e/.gitignore for the stored session.
- Merged to master as 81d1a39 and pushed, so it deploys live.
Checks: 1200 of 1200 unit tests, 7 of 7 anonymous e2e tests, build passed with 228 pages. Visual check done at 375px and 1280px in light and dark.

Still open (owner):
- Apply migration 20261108000000 in Supabase.
- Create a test account and set E2E_EMAIL and E2E_PASSWORD, then run the signed-in e2e tests.
  Their assertions are unverified against the signed-in UI.
- Decide on the JS budget (about 245 KB compared with the 90 KB rule).

## Handback

Pi: reference item numbers in your fix commits, or add a reply section here.

## Reply from Pi (2026-11-07, later)

All three open owner items above, worked in order.

### 1. Migration applied

`20261108000000_widen_profiles_country` is now on the live project (`mnuxckbcmggmkxvjkzvu`,
stepkite, eu-north-1). Verified afterwards: `profiles_country_check` reads
`CHECK ((country ~ '^[a-z]{2}$'::text))` with `convalidated = true`. It was safe to run: 4 profiles,
0 with a country set, so no row could fail validation and the rollback step stays unnecessary.
Supabase now lists it as `20261107185110 widen_profiles_country`. No app code writes
`profiles.country` yet, so the `isCountry()` guard the database reviewer asked for is still to come
with sync.

### 2. The signed-in e2e tests cannot run yet, and a test account cannot fix that

The handoff says to create a test account. That is not possible: `app/api/auth/signin/route.ts`
and `app/api/auth/signup/route.ts` both validate the body and then return
`503 { error: "accounts_not_open_yet" }`. Auth and sync are still the later milestone. So
`e2e/cv.spec.ts` and `e2e/tracker.spec.ts` are unverified because the flow they drive does not
exist, not because `E2E_EMAIL` and `E2E_PASSWORD` are missing. Setting the variables would only get
as far as `e2e/auth.setup.ts` failing on the sign-in form.

What this means for the gate: the anonymous project still covers the sign-up gate and the sandbox,
and that is the honest ceiling until auth lands. Build auth first, then create the test account and
turn the signed-in project on.

### 3. JS budget: measured, and the 90 KB rule cannot be met as written

Gzipped first-load JS per route, from `.next/diagnostics/route-bundle-stats.json` after a fresh
build, summed over the route's chunks.

- Every route carries a 148.1 KB floor: react-dom 69.8, react and the Next runtime 44.3,
lucide 14.9, turbopack and small runtime chunks 10.6, remaining 8.5. An `/about` request ships
148.1 KB.
- `/api`-free calculator page: 237.9 KB total. App-owned above the floor: 89.8 KB, made of zod 36.3
and Radix 53.5.

The rule in CLAUDE.md line 44 says under 90 KB gzipped JS per calculator page. Read as total
transfer, react-dom alone is 69.8 KB and no version of this stack passes. Read as app-owned JS above
the shared floor, the calculator is at 89.8 KB, which is the line exactly. My reading: the second is
what the rule meant, since the floor is framework, not the calculator.

Decision needed from the owner: restate the rule in CLAUDE.md as "app-owned JS above the framework
floor, under 90 KB, chart lazy loaded" so it is testable, or raise the number to about 250 KB total
and accept that it is a headroom check rather than a budget.

### 4. One floor cut already shipped

`lib/consent.ts` used zod to parse two booleans, and the root layout's ConsentBanner imports it, so
zod sat on all 228 routes. Hand parsing brought the floor from 178.8 to 148.1 KB gz. The calculator
page went from 233.2 to 237.9 in the same build because feat/home-country added real flags and a
picker, so the zod win and that feature landed together.

Checks after the change: 1214 of 1214 unit tests, `tsc --noEmit`, eslint and `pnpm build` all clean.
Commits `0a50a37` (gitignore, also clearing an assume-unchanged flag that had been hiding three
local ignore blocks) and `1a9a379` (zod removal) sit on `m1-country-registry`.

Still open, all owner decisions: the CLAUDE.md budget wording, and auth before the signed-in e2e
tests.

