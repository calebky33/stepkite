---
name: new-calculator
description: Full workflow to add a take-home-pay calculator for a country (uk, us-<state>, in). Use when the user says "/new-calculator", "add a pay calculator", or names a new country/state.
---

# New pay calculator: $ARGUMENTS

Work in this order. Run steps 2 and 3 in parallel.

1. **Scope (you, 2 min):** read docs/CALCULATOR-UX.md (flow, result card, intent, compare, privacy) and docs/TAX-RULES.md section for the country. List inputs (salary, period, region, pension %, student loan / regime / filing status) and outputs. Confirm the tax year.
2. **Engine → `tax-engine` agent:** build `lib/tax/<country>/` with sourced rates and worked-example tests.
3. **UI → `ui-builder` agent:** `components/tools/PayCalculator/<Country>Form.tsx` using the shared `PayCalculator` shell (inputs left, live result card right on desktop; stacked on mobile; sticky net-pay bar on mobile). Uses a mock `PayResult` until the engine lands.
4. **Wire (you):** connect form to engine; result card shows breakdown table, monthly/weekly toggle, donut chart, "Source: … · verified <date>", "Estimate, not tax advice", Share button, and CTA "Build a <country> CV" → `/[country]/cv`.
5. **Pages → `seo-content` agent:** `app/[country]/salary-calculator/page.tsx` + salary-level pages only where useful.
6. **Verify:** `test-runner` (typecheck, lint, `pnpm test lib/tax/<country>`, build) then `reviewer`. Fix BLOCKING items.

Done = engine tests pass, page builds, reviewer clean, checked at 375px and 1280px.
