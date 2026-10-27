# DESIGN.md — UI system

Feel: calm, trustworthy, fast. A precise tool, not a marketing site. Numbers are the hero.
Colours and type come from the Stepkite logo (docs/BRAND.md). Polish rules come from the `emil-design-eng`, `mobile-native` and `review-animations` skills.

## Tokens (CSS variables in `app/globals.css`, mapped in `tailwind.config.ts`)
| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | #F7F8FB (Paper) | #0B1533 (Ink) | page |
| `--surface` | #FFFFFF | #111C3D | cards |
| `--surface-2` | #EEF1F7 | #18244A | inputs, wells |
| `--border` | #E3E7F0 | #24315C | dividers |
| `--text` | #0B1533 (Ink) | #E8ECF5 | body |
| `--text-muted` | #4A5470 | #A3ADC6 | hints |
| `--primary` | #1A3FD1 (Deep Blue) | #7FA0FF | actions, links, focus ring |
| `--primary-fg` | #FFFFFF | #0B1533 | text on primary |
| `--brand` | #3D6BFF (Kite Blue) | #3D6BFF | logo, charts, large accents only (not small text: 4.4:1 on white) |
| `--accent-soft` | #E8EEFF (Sky) | #18244A | selected rows, highlights |
| `--highlight` | #FFB020 (Sunrise) | #FFB020 | rare emphasis badges, with Ink text |
| `--positive` | #0F8A5F | #3FCF94 | net pay |
| `--tax` | #D9822B | #F0A55A | tax segments |
| `--danger` | #C8372D | #FF6B60 | errors |
Contrast: every text pair ≥ 4.5:1 (checked: Ink on Paper, Deep Blue on white, #7FA0FF on Ink, muted on both surfaces). Check new colours before use.

Type: Plus Jakarta Sans ExtraBold (800) for the logo, page titles and result figures' labels; Inter (400, 600) for UI and body; `tabular-nums` for every figure. Load both with `next/font` (self-hosted, no layout shift). Scale 12/14/16/18/22/28/36/48. Body 16px, line-height 1.5. Result figure 36–48px, bold, `tabular-nums`. Inputs never below 16px (stops iOS zoom).
Spacing: 4px base (4, 8, 12, 16, 24, 32, 48, 64). Radius: 8 (inputs), 12 (cards), 999 (pills). Shadow: one soft level for cards; none in dark mode (use border).
Breakpoints: 375 / 768 / 1024 / 1280. Max content width 1120px.

## Motion tokens (from emil-design-eng)
- `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` for enter and exit. `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)` for on-screen movement. Never `ease-in` on UI.
- Durations: press 100 to 160ms, tooltip 125 to 200ms, dropdown 150 to 250ms, sheet 200 to 300ms. UI stays under 300ms.
- Animate `transform` and `opacity` only. Never from `scale(0)`; start at `scale(0.95)` with opacity 0. Buttons `scale(0.97)` on `:active`.
- No animation on keyboard-triggered or 100-times-a-day actions. Gate hover motion behind `@media (hover: hover) and (pointer: fine)`. Honour `prefers-reduced-motion` (keep opacity, drop movement).

## Mobile baseline (from mobile-native)
`viewport-fit=cover`, `env(safe-area-inset-*)` on sticky bars, `100dvh` for app shells, `-webkit-tap-highlight-color: transparent`, `touch-action: manipulation` on controls, `theme-color` per colour scheme. Never disable zoom.

## Interaction patterns
- **Live results:** recompute on input (150ms debounce). Animate number changes with a 200ms count tween; respect reduced motion.
- **Calculator layout:** desktop two columns (inputs 40% / sticky result 60%); mobile stacked with a sticky bottom bar showing net monthly pay that scrolls to the breakdown.
- **Inputs:** currency input with locale formatting (₹ uses lakh grouping), slider + field pair for salary, segmented controls for period (year/month/week) and regime.
- **Breakdown:** donut (net vs each tax) + table; hover/tap a segment highlights its row.
- **Compare mode:** India old vs new regime and "offer A vs offer B" side by side with the difference highlighted.
- **CV builder:** editor + live paginated preview; drag to reorder sections (with keyboard alternative: move up/down buttons); undo/redo; autosave indicator.
- **Tracker:** kanban (Saved, Applied, Interview, Offer, Closed) with list view on mobile.
- **Empty states:** one sentence + one primary action. **Loading:** skeletons sized to final layout. **Errors:** inline, say what to do.
- **Share:** result card renders to an OG image (`app/api/og`) with no personal data, just salary and country.
- **Worst-case data:** every list and card is tested with the `break-ui` catalog (long names, long emails, 0, 1, 1,000 items) before it ships.

## Components (components/ui)
Button, IconButton, Input, CurrencyInput, Select, SegmentedControl, Slider, Switch, Tooltip, Dialog, Sheet (mobile), Tabs, Card, Badge, Toast, Skeleton, Table, ProgressSteps.
Libraries: Radix primitives for behavior, `lucide-react` icons, `framer-motion` only in the CV builder (lazy loaded; use full `transform` strings, not `x`/`y` shorthands), charts as hand-written SVG on calculator pages (no chart library there).

## Ads
Fixed-size slots with reserved height; never above the result on mobile; never inside the CV builder or tracker; labelled "Advertisement".
