---
name: cv-template
description: Adds a country's CV conventions, templates, and ATS checks to the CV builder. Use for "/cv-template", "add <country> CV format", or CV rules work.
---

# CV template: $ARGUMENTS

1. **Rules (`lib/cv/rules/<country>.ts`):** research official/university careers-service guidance (WebSearch; cite sources in comments). Capture: photo yes/no, max pages, date format, personal details allowed (DOB, nationality, marital status — usually NO for UK/US), section order, name for the document (CV vs résumé), paper size (A4 vs Letter), spelling (en-GB/en-US/en-IN).
2. **Schema:** reuse `lib/cv/schema.ts` (zod). Never add a field just for one template; use `rules` to show/hide.
3. **Templates → `ui-builder`:** 3 free templates in `components/tools/cv/templates/<country>/`. ATS-safe: single column default, real text (no text in images), standard headings, system or embedded fonts.
4. **Live preview:** editor left, paginated A4/Letter preview right (desktop); tabbed Edit/Preview on mobile. Autosave to IndexedDB every change (debounced 500ms) with a "Saved on this device" indicator.
5. **ATS check:** rules flag photo where not expected, missing contact, > page limit, tables/columns, dates inconsistent, generic AI phrases list in `lib/cv/phrases.ts`.
6. **PDF:** browser export; text selectable; test the file opens and text extracts.
7. **Verify:** `test-runner` then `reviewer`.
