# BRAND.md — Stepkite

Name: **Stepkite** (always one word, lowercase in the logo, "Stepkite" in sentences).
Idea: a kite built from an Ink facet and a blue facet with a staircase rising through it. Step up, then rise.
Logo canvas (source designs): https://claude.ai/artifact/U9s7JZgsXz1PS3brW2ba6n

## Files (`brand/`)
| File | Use |
|---|---|
| `stepkite-mark.svg` | the kite mark alone (header on small screens, social avatars) |
| `stepkite-logo-dark.svg` | the logo for dark backgrounds (lighter facets, light wordmark). On the site use `components/ui/Logo.tsx`, which switches by itself |
| `stepkite-logo.svg` | mark + wordmark (site header, emails). The wordmark is live text in Plus Jakarta Sans 800: convert to outlines before print or use outside the site |
| `stepkite-app-icon.svg` | PWA and app icons (export 192, 512, 180 PNG) |
| `favicon.svg` | browser tab; steps removed so it reads at 16 and 32px |

## Colours
White pages, near-black text, blue only where something is clickable. Standard and professional.
| Name | Hex | Use |
|---|---|---|
| White | #FFFFFF | page and card background |
| Ink | #111827 | text, left facet of the logo, app icon |
| Mist | #F4F5F7 | inputs, wells |
| Deep Blue | #1A3FD1 | buttons, links, focus ring, right facet of the logo |
| Kite Blue | #3D6BFF | charts and large accents only (not small text) |
| Slate | #EEF1F6 | selected rows, soft highlights |
| Sunrise | #FFB020 | rare emphasis, always with Ink text |
On dark backgrounds (#0E1116) the facets become #E5E7EB and #7FA0FF, and the steps take the background colour.
Meaning colours stay fixed: green for net pay, orange for tax, red for errors.

## Rules
- Keep clear space around the logo equal to the height of the steps.
- Never stretch, rotate, recolour outside this palette, add shadows, gradients or outlines.
- Minimum size: mark 16px (use `favicon.svg` below 32px), full logo 96px wide.
- Before launch: trademark search (USPTO, UKIPO, India, WIPO) and register stepkite.com.
