# CALCULATOR-UX.md

How every Stepkite pay calculator behaves. It applies to all countries and is read by `/new-calculator`. Ideas come from public market research. Tax logic, figures, text and styling are always our own and follow TAX-RULES.md, VOICE.md and DESIGN.md.

## Flow

1. **Country** comes from the route (`app/[country]/`), never a dropdown on the page. A small link switches country.
2. **Region** where tax differs: US state, UK nation (England, Wales, Northern Ireland, Scotland), India state for professional tax. Show as tappable chips, not a long dropdown. Put the most searched options first and keep the full list one tap away. Chips are real buttons with `aria-pressed`.
3. **Situation:** filing status (US), tax regime (India), pension and student loan (UK). Short segmented controls with plain labels.
4. **Salary:** one large numeric field with `inputMode="numeric"`, thousands separators as you type, a period switch (year, month, week, day, hour), and a sensible starting value so the result is never empty.
5. **Result:** updates live as inputs change. No submit button for the main answer.

## Result card

- First line is the answer in plain words: "You take home £3,120 a month." The breakdown comes after.
- Then: gross, each deduction by name, net. Per year, month and week.
- A donut or stacked bar shows where each pound goes. Text values sit beside it, so the chart is never the only source.
- Footer line on every result: the tax year, "Source: <official page>, verified <date>", and "This is an estimate. Your payslip may differ."
- Mobile: a sticky bar shows net pay while inputs are scrolled.

## Intent (optional, never blocks the result)

Three choices under the result, each changing only what is offered next:
- **Checking my payslip:** show a line by line comparison box and common reasons figures differ (tax code, pension method).
- **Weighing a job offer:** show the pay needed to match a current salary, and links to the tracker.
- **Moving or changing region:** show the same salary in another region side by side.

## Compare

- "Compare with another salary or region" adds a second column. Both columns share inputs unless changed.
- The comparison is encoded in the URL so it can be shared or saved. No personal data in the URL beyond the numbers the user typed.
- Share creates an image through `api/og` with the figures. No name, no email.

## Currency

- Show the local currency. A small "show in" switch to a few other currencies uses a dated exchange rate with its source and date shown. If no verified rate is available, hide the switch.

## Next steps

- One quiet link after the result: "Build a <country> CV" to `/[country]/cv`. No pop ups, no gated results.
- Email capture is optional and only after the result. It never blocks, never pre-ticks consent, and sends only if the user asks for it. Needs approval before it is built (privacy and data storage).

## Privacy

- Inputs stay in the browser. Nothing is sent to a server to compute a result.
- Analytics load only after explicit opt in, respect Do Not Track, and record no salary values.
- The URL may hold the numbers for sharing, but analytics never receive the URL's query.

## Accessibility and performance

- Every control has a visible label and focus ring, usable by keyboard only. Results are announced with `aria-live="polite"` (debounced).
- Error text names the field and the fix: "Enter a salary between 0 and 10,000,000."
- Meets the CLAUDE.md budget: LCP under 2.0s, CLS under 0.05, INP under 200ms, under 90KB gzipped JS per calculator page. The chart is lazy loaded.

## Tests

- Engine: worked examples from the official source, per TAX-RULES.md.
- Form: edge inputs (0, huge, decimals, pasted text with symbols), every region chip, keyboard only run, 375px and 1280px, light and dark.
- URL state: round trip a comparison through the link and check the same result.

## Architecture lessons from market research

- **Many small pages beat one big tool.** A strong calculator site has a page per country and region, plus "same salary, different region" comparison pages. Plan for hundreds of static pages from one engine, generated from data, not written by hand. Add a page only when it has real search demand and a tested result.
- **Engines run in the browser.** Results are instant and private. Keep each country's engine in its own file and load only that one. A shared bundle holding every country breaks the 90KB budget.
- **Cite on the page.** Each page names the official source and the date it was checked. Our `rates.<year>.ts` files already carry this. Render it from the same data so the page and the engine cannot disagree.
- **Show what changed.** Publish a short updates feed (RSS and a page) when a rate or threshold changes. It builds trust and gives search engines fresh content.
- **Structured data.** `FAQPage`, `WebApplication` and `BreadcrumbList` JSON-LD on every calculator page, generated from the same content as the visible text.
- **Exchange rates are data, not code.** Keep rates in a dated file with a named source. Show the date next to any converted figure. Refresh on a schedule and fail visibly when stale.
- **Remember the last country in `localStorage` only.** Do not store scores, logs or a profile of the visitor. Behavioural lead scoring is out of bounds under CLAUDE.md rule 3.
- **Paid extras come after the free answer.** If a paid report is offered, it sits below the result, creates a Stripe Checkout session through our server route, and never hides the free numbers.
