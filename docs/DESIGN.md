# DESIGN.md — UI system

Feel: calm, trustworthy, fast. A precise tool, not a marketing site. Numbers are the hero. The homepage introduces the toolkit once; every tool page still opens with the tool itself.
Colours and type come from the Stepkite brand (docs/BRAND.md): near-white pages with white raised cards, near-black text, blue only for actions, links and focus. Premium comes from type, spacing and layered soft shadows, not decoration. Allowed: shadow scale, hairline inner highlight on raised surfaces, a serif display face. Still banned: gradients, glass blur, glowing blobs, sparkle icons, stock art, rows of identical cards. Polish rules come from the `emil-design-eng`, `mobile-native` and `review-animations` skills.

## Tokens (CSS variables in `app/globals.css`, mapped in `tailwind.config.ts`)

| Token                                                                                                                                                                                                                                                              | Light               | Dark    | Use                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- | ------- | ----------------------------------------------------------------- |
| `--bg`                                                                                                                                                                                                                                                             | #F7F8FA             | #0B0E13 | page                                                              |
| `--surface`                                                                                                                                                                                                                                                        | #FFFFFF             | #151A21 | cards (raised by border and soft shadow)                          |
| `--surface-2`                                                                                                                                                                                                                                                      | #F1F3F6             | #1D232C | inputs, wells                                                     |
| `--border`                                                                                                                                                                                                                                                         | #E3E5E9             | #2A313C | dividers                                                          |
| `--border-strong`                                                                                                                                                                                                                                                  | #6B7280             | #7D8798 | input and control boundaries (3:1 or better)                      |
| `--text`                                                                                                                                                                                                                                                           | #111827 (Ink)       | #E8EAED | body                                                              |
| `--text-muted`                                                                                                                                                                                                                                                     | #4B5563             | #A1A9B5 | hints                                                             |
| `--primary`                                                                                                                                                                                                                                                        | #1A3FD1 (Deep Blue) | #7FA0FF | actions, links, focus ring                                        |
| `--primary-fg`                                                                                                                                                                                                                                                     | #FFFFFF             | #0E1116 | text on primary                                                   |
| `--brand`                                                                                                                                                                                                                                                          | #3D6BFF (Kite Blue) | #3D6BFF | logo, charts, large accents only (not small text: 4.4:1 on white) |
| `--accent-soft`                                                                                                                                                                                                                                                    | #EEF1F6 (Slate)     | #1D232C | selected rows, highlights                                         |
| `--highlight`                                                                                                                                                                                                                                                      | #FFB020 (Sunrise)   | #FFB020 | rare emphasis badges, with Ink text                               |
| `--positive`                                                                                                                                                                                                                                                       | #0F8A5F             | #3FCF94 | net pay                                                           |
| `--tax`                                                                                                                                                                                                                                                            | #D9822B             | #F0A55A | tax segments                                                      |
| `--danger`                                                                                                                                                                                                                                                         | #C8372D             | #FF6B60 | errors                                                            |
| Contrast: every text pair ≥ 4.5:1 (checked: Ink on white, Deep Blue on white, #7FA0FF on #0E1116, muted on #F7F8FA about 7:1 and on #F1F3F6 about 6.8:1, border-strong on #F1F3F6 about 4.3:1 which passes the 3:1 control minimum). Check new colours before use. |

Type: Calistoga (400 only, never faux bold) for page titles and section headings; Inter (400, 500, 600) for UI, body and every figure, with `tabular-nums` (Calistoga has no tabular numerals); Plus Jakarta Sans 800 only for the logo wordmark (`--font-logo`). Load all three with `next/font` (self-hosted, no layout shift). Scale 12/14/16/18/22/28/36/48. Body 16px, line-height 1.5. Result figure 36–48px, semibold, `tabular-nums`. Inputs never below 16px (stops iOS zoom).
Spacing: 4px base (4, 8, 12, 16, 24, 32, 48, 64). Radius: 8 (inputs), 12 (cards), 999 (pills). Shadow: three layered soft levels (`--elev-sm` cards, `--elev-md` popovers, `--elev-lg` dialogs and sheets) plus a 1px inner top highlight on cards, and `--elev-up` for sticky or fixed bottom bars; in dark mode the same levels use black at higher opacity and the border does most of the work.
Breakpoints: 375 / 768 / 1024 / 1280. Max content width 1120px.

## Motion tokens (from emil-design-eng)

- `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` for enter and exit. `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)` for on-screen movement. Never `ease-in` on UI.
- Durations: press 100 to 160ms, tooltip 125 to 200ms, dropdown 150 to 250ms, sheet 200 to 300ms. UI stays under 300ms.
- Animate `transform` and `opacity` only. Never from `scale(0)`; start at `scale(0.95)` with opacity 0. Buttons `scale(0.97)` on `:active`.
- No animation on keyboard-triggered or 100-times-a-day actions. Gate hover motion behind `@media (hover: hover) and (pointer: fine)`. Honour `prefers-reduced-motion` (keep opacity, drop movement).

## Mobile baseline (from mobile-native)

`viewport-fit=cover`, `env(safe-area-inset-*)` on sticky bars, `100dvh` for app shells, `-webkit-tap-highlight-color: transparent`, `touch-action: manipulation` on controls, `theme-color` per colour scheme. Never disable zoom.

## Homepage

- One introduction, then the tools. The hero shows a real CV page, links to the CV builder first and to the suite second. The suite states what works today and what is still being built. The pay calculator follows in its own section, then two links back into the tools.
- Status labels must match the code: `Available` only when the tool works end to end, `Beta` when it works with a gap such as a missing export, `Coming soon` when the engine or route is not ready, `Draft` for content a person still has to rewrite.
- No empty ad box on the homepage. Ads stay on calculator and guide pages.

## Shell

- Header: sticky, one row. Logo, then Pay calculator, CV builder, Tools and Pricing. The country switcher and a primary "Build a CV" button sit on the right; from 640px up, until the full button fits, a short "Build CV" button takes its place. Below 640px the menu carries the full-width primary button. Below 1024px the links move into a menu button with `aria-expanded` and `aria-controls`. Escape closes the menu and returns focus to the button. The exact route uses `aria-current="page"`; a link that only covers the section uses `aria-current="true"`.
- Footer: brand line, then Tools, Explore and Stepkite columns, a Product updates signup, then countries, legal and the theme control. Tool links follow the country in the URL, or the UK on global pages.

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
