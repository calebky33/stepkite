# CV-BLUEPRINT.md

Engineering blueprint for the CV builder and the systems around it. It follows CLAUDE.md and ARCHITECTURE.md: static first, the builder runs on the device, Supabase only for signed-in sync and payment records. Where an idea needs a stack change, it is listed under "Needs approval" and not built.

Source of ideas: public market research on how CV builders are put together. Everything below is designed for Stepkite. No third party names, text, images or template designs are reused.

## 1. Principles

1. One CV is one versioned JSON document. Content, template id and style tokens are stored apart, so switching template never loses data.
2. One renderer draws the live preview, the PDF and the shared page. Preview and download cannot differ.
3. Users change style only inside allowed ranges. Nothing a user types can break a page.
4. The device is the source of truth. Sync is optional and last-write-wins, as in ARCHITECTURE.md.
5. AI suggests, the user approves each line (CLAUDE.md rule 6).

## 2. Layout engine

Each template ships a token manifest. The editor only offers values inside it.

| Token | Allowed values |
|---|---|
| accent | 6 to 8 approved colours, each at least 4.5:1 contrast on the page background |
| fontPair | 4 to 6 curated pairs, ATS safe, subset loaded |
| fontScale | 0.9 to 1.1 in steps of 0.05 |
| spacing | compact, normal, roomy (fixed rem sets) |
| margins | 12 to 24 mm |

Rules that keep layouts intact:
- Tokens become CSS variables. Values are clamped in `lib/cv/tokens.ts` on every load and save. Free-form colours, sizes and font names never reach CSS.
- Sections sit in fixed grid areas with `overflow-wrap: anywhere` and `break-inside: avoid` on each entry.
- Pagination: render offscreen, measure, split at entry boundaries, never inside a bullet.
- Field limits are soft warnings in the editor and hard caps in the zod schema.
- Rich text allows bold, italic and bullets only, sanitised on save. No raw HTML.
- Every template is tested with worst-case data (`break-ui` skill): 40 bullets, very long names, no photo, right to left text, Hindi and CJK characters.

## 3. Page structure

Landing page order: promo banner (only while a real promo runs), header, hero with the template preview, proof strip, template gallery, how it works, upload prompt ("Already have a CV?"), country guides, tools links, FAQ, final call to action, footer.

- Proof strip shows only real, sourced numbers (CLAUDE.md rule 5). No counters until they exist.
- Gallery thumbnails are rendered at build time from the real renderer with sample data, served as WebP.
- FAQ uses native `<details>` and one data source that also produces the FAQPage JSON-LD.
- Routes are per country (`app/[country]/cv/`). Slugs are translated per language when a language ships. `hreflang` on every page.
- Country is read at the edge (Cloudflare country header), never in client JS. It sets currency, spelling, page size and CV rules.
- Sample CV pages by job title and country are the main search content. They live in `content/<country>/` and use the same renderer.

## 4. Devices and sync

- Free users: IndexedDB only (`lib/storage/`). No account.
- Signed in: the sync adapter pushes the whole document with `updated_at`. Last write wins, one previous version kept (ARCHITECTURE.md).
- Phone and desktop use the same web app. It ships as a PWA first. Native apps are out of scope until the validation gate in ROADMAP.md is passed.

## 5. Autosave and versions

- Save to IndexedDB 500 ms after the last keystroke. Show "Saved on this device" and, when signed in, "Synced".
- Keep the last 10 local snapshots, one per five minutes of editing, so a bad edit can be undone.
- Duplicate makes a new id and the title "Copy of ...". Delete moves to a 30 day bin.
- A CV cannot be lost by closing the tab. Test it.

## 6. Import (existing CV to fields)

Pipeline: file (PDF, DOCX, TXT, 5 MB cap) to text, text to schema, review screen.
1. Extract text in the browser where possible (`pdf.js`, `mammoth`). The file never leaves the device unless the user chooses AI-assisted import.
2. A rules pass finds sections and dates. If confidence is low, the optional server route `api/import` maps the text to the zod schema with structured output.
3. A review screen shows low-confidence fields first. Nothing is saved until the user confirms.
Tradeoff: browser parsing is private and free but weaker on odd layouts. AI import costs money and sends text to a server, so it is opt-in and rate limited like `api/match`.

## 7. AI writing

Tasks: summary, bullet expander, tone and grammar rewrite, tailor to a job ad, cover letter.

```
client -> api/ai/{task} -> auth + rate limit -> context (CV JSON, locale, job ad)
  -> model call with structured output -> zod validate -> return as a diff
```
- Before any request, the UI shows what text will be sent, and the user confirms. CV text is never sent silently (CLAUDE.md rule 3).
- Every prompt forbids invented employers, dates, figures and qualifications. Unknown numbers become visible placeholders such as `[number]`.
- Results always arrive as a diff. The user accepts line by line.
- An eval set of 100 hand-written profiles per task checks fabrication, length and tone. It runs on every prompt or model change.
- Cost control: daily quota per user and per IP, a small model for rewrites, a larger one for tailoring, cache by content hash.
- Output goes through `copy-editor` rules too: plain, specific, local spelling, no dashes, no filler.
- No model fine-tuning at launch. Revisit after real usage data exists.

## 8. Languages

- `content_locale` on each CV is separate from the site language.
- English first (UK, US, India variants), then Spanish and Portuguese, then German and French.
- Translation runs section by section with a glossary per language (job titles, tools, certifications) and a never-translate list (company names, products, acronyms). A translated CV is a new document linked by `translated_from`.
- Locale rules live in `lib/cv/rules/<country>.ts`: date format, A4 or Letter, photo yes or no, fields like nationality or date of birth, spelling.

## 9. Export

- PDF is generated in the browser from the same renderer (CLAUDE.md stack). Fonts are bundled.
- ATS test in CI: extract text from each exported PDF and assert reading order and that every section is present. No text as images, no scrambled columns.
- DOCX uses the `docx` library from the same JSON with a simpler layout. It will not match the PDF exactly, and the UI says so.
- Needs approval: a server PDF worker (headless Chromium). Only worth it if browser PDF fails the ATS test on real devices.

## 10. Sharing and personal site

- Creating a share link uploads that CV, so the UI says so and asks for confirmation first (CLAUDE.md rule 3).
- Share link: random 128 bit token, `noindex` by default, optional expiry, revocable, option to hide phone and address. Never sequential ids. Requires sign in because it needs a server record.
- Personal site: a second set of responsive templates over the same JSON and tokens. One click publishes a snapshot to `name.stepkite.com`. Default is publish on click, not live linked, so unfinished edits never leak.
- Both are Pro features and come after the validation gate.

## 11. Promotions

- The server decides what is live: `GET /api/promo?country=GB` returns `{ code, percentOff, endsAt, serverNow }` (UTC).
- The client counts down `endsAt` minus `serverNow`, so a wrong device clock changes nothing. It stops at zero and the banner disappears.
- Stripe is the authority. The coupon carries `redeem_by = endsAt`. After that time checkout refuses the code.
- No resetting timers, no fake deadlines, no invented "was" prices. A struck-through price must be one we actually charged recently (UK and EU rules). Respect `prefers-reduced-motion`.
- The banner reserves its height so the page does not jump.

## 12. Student and teacher access

```
Verify button -> provider (email domain check first, vendor later) -> signed webhook
  -> verify signature and idempotency -> record verification -> entitlement (kind student, expires_at)
```
- One grant per verified person. Re-verify at expiry. Revoke if the provider reverses.
- Launch with an allow-list of education email domains (`.ac.uk`, `.edu`, `.ac.in`). Add a verification vendor once volume justifies the fee and the agreement.
- Reuses the `entitlements` table in ARCHITECTURE.md with `kind = 'student'`.

## 13. Data

Sync tables extend ARCHITECTURE.md. RLS on every table: `user_id = auth.uid()`.

```
cvs(id, user_id, title, data jsonb, schema_version int, template_id, tokens jsonb,
    content_locale, translated_from uuid null, updated_at, deleted_at null)
cv_versions(id, cv_id, data jsonb, created_at)           -- one previous version
share_links(token pk, cv_id, expires_at null, hide_contact bool, revoked_at null)
sites(id, cv_id, subdomain unique, template_id, snapshot jsonb, published_at)
promotions(id, code, percent_off, starts_at, ends_at, countries text[], stripe_coupon_id, active)
student_verifications(id, user_id, method, status, verified_at, expires_at)
```
Existing: `profiles`, `jobs`, `entitlements`. Public reads of a share link or site go through a server route that checks the token. No public table access.

## 14. Milestones

Mapped to ROADMAP.md. One Claude Code session per line.

| ROADMAP weeks | Work |
|---|---|
| 1 to 2 | Scaffold, tokens, one template rendered from JSON, country routing |
| 5 to 7 | Schema, IndexedDB, editor, live preview, token clamping, pagination, autosave and snapshots, three country templates, browser PDF, ATS test |
| 7 | Sync and RLS, Pro Pass, AI tasks with eval set, promo module |
| 8 | Validation gate with 30 strangers |
| 9 to 12 | Import review screen, DOCX, share links, sample CV pages, Spanish and Portuguese |
| Later | Personal site, student vendor, server PDF if needed, native apps, German and French |

## 15. Needs approval before building

1. Server PDF worker (changes the stack).
2. Verification vendor for students (cost and contract).
3. AI import route (sends CV text to a server).
4. Native apps.

## 16. Tests

Unit: token clamping, schema validation, promo window with fake clocks and time zones. Visual: every template with worst-case data at 375 px and 1280 px, light and dark. ATS: text extraction from exported PDFs. Autosave: close the tab mid-edit, two tabs, offline then online. Import: 30 real CVs. Promo: Stripe test mode with an expired `redeem_by`. End to end (Playwright): create, edit, export, share, delete.

## 17. Lessons from market research (all folded into the sections above)

Added after a second look at how established builders are put together. Mechanics only. Nothing here reuses anyone's text, images, prices or designs.

| Lesson | What Stepkite does | Section |
|---|---|---|
| The live preview runs as its own service on its own origin, embedded in the editor. | Serve `/render` from a separate route with strict CSP and no access to app cookies. User content cannot reach app state. | 1, 9 |
| One shared preview modal is filled from data on the clicked card. | One `TemplatePreview` component takes a template id. No per-card modal markup. | 3 |
| "Show all templates" loads more cards from the server in pages. | Gallery pages from JSON (`offset`, `limit`) and renders with React. Static first page for speed and search. | 3 |
| A countdown reads a date and uses the visitor's device clock. | Promo sends `endsAt` and `serverNow` in UTC. The client never trusts its own clock. Ends exactly when Stripe's `redeem_by` ends. | 11 |
| Ratings are posted with a CSRF token and mirrored in a cookie. | No ratings in cookies. Any feedback is stored server side with a CSRF-safe route, or not at all. | 13 |
| Country is decided on the server and drives prices and copy. | Read the country at the edge (Cloudflare header). Never in client JS. | 3 |
| Sitemaps are mostly sample CVs, cover letters, categories and guides. | Sample CV pages by job title and country, built from data with the same renderer. Add a page only when it has real demand and passes tests. | 3 |
| A free ATS checker brings in visitors. | A free CV checker that runs in the browser: upload, score, then offer the builder. Results are not sold to anyone. | 6, 9 |
| Subscriptions with a rolling discount are the norm. | Pro Pass is one payment and the price is the price. Say so plainly on the pricing page. | RULES 1, 2 |
| Cloud import (a file picker for Dropbox or Drive) sits next to upload. | Add a Drive or Dropbox picker after launch. The file is read in the browser. | 6 |
| Several payment options (cards, PayPal, wallets). | Stripe first. Add PayPal for the UK and India after the validation gate if checkout drop-off shows the need. | 12 |
| Error tracking is wired in from day one. | Add Sentry or an equivalent with personal data scrubbed. CV text and emails never leave in an error report. | RULES 22 |

### Still unknown (needs a signed-in session we will not create)
Editor internals, autosave protocol, export engine, AI prompts, parser, site builder. Sections 5 to 10 are our own design, not copied.
