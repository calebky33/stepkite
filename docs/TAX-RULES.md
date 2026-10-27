# TAX-RULES.md — what each engine must cover

No numbers in this file on purpose: rates change. Engines fetch them from official sources and store them in `rates.<year>.ts` with `source` + `verifiedOn`.

## Shared types (`lib/tax/types.ts`)
`PayInput { country, taxYear, gross, period: 'year'|'month'|'week'|'hour', hoursPerWeek?, region?, options }`
`PayResult { gross, lines: {key,label,amount,source}[], net, perPeriod: {year,month,week}, assumptions: string[] }`

## UK (gov.uk / HMRC)
- Income tax: rUK bands and Scottish bands (region switch); personal allowance and its taper over the high-income threshold.
- Employee National Insurance (Class 1).
- Student loan plans (1, 2, 4, 5, postgraduate), selectable.
- Pension: relief-at-source vs net-pay vs salary sacrifice, % input.
- Tax code override (advanced).

## US (IRS + state agencies) — launch: federal + largest states first
- Federal income tax by filing status, standard deduction.
- FICA: Social Security (wage cap) + Medicare (+ additional Medicare over threshold).
- State income tax per state file; flag states with none; local taxes listed as "not included" unless implemented.
- Pre-tax 401(k) %, pay frequency.

## India (incometax.gov.in)
- New and old regime, compare side by side.
- Standard deduction, rebate (87A), surcharge, health & education cess.
- Old regime deductions: 80C, 80D, HRA (inputs), etc.
- CTC → in-hand: employer/employee PF (state the assumption: on basic, capped or not), gratuity excluded from in-hand, professional tax by state.
- Clearly label the financial year and assessment year.

## Every engine
- Assumptions array shown to the user.
- Tests: ≥ 6 official worked examples + boundaries.
- Re-verify on each budget (UK spring/autumn, India Feb 1, US year-end) and quarterly.
