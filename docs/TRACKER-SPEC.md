# TRACKER-SPEC.md

Spec for the Stepkite job tracker. It follows CLAUDE.md and ARCHITECTURE.md: the tracker runs in the browser and stores data in IndexedDB. Supabase only holds data for signed-in sync. Ideas come from public market research on how job trackers are built. Everything here is our own design.

## Goal

One place to see every application, what happens next, and what is working. It must beat a spreadsheet in the first minute and stay useful after 100 jobs.

## Core features (free)

1. **Board.** Columns are stages. Cards drag between columns, with a keyboard alternative (move left or right, menu). A list view shows the same data in a table with sorting.
2. **Stages.** Default: Saved, Applied, Screening, Interview, Offer, Rejected, Withdrawn. The user can rename and reorder but not delete a stage that holds jobs.
3. **Job card fields.** Title, company, location, link, source, salary range and currency, date saved, date applied, stage, notes, contacts, documents, next step and its date.
4. **Add a job.** Three ways: paste a link (title and company are read from the page where allowed, otherwise typed), paste the job text, or fill the form. A browser extension to save jobs from any page is a later feature and needs approval.
5. **Timeline.** Every job keeps a log: saved, applied, moved, interview logged, note added. The user can edit or delete entries.
6. **Interviews.** Date, time, type (phone, video, on site), people, prep notes, result. Upcoming interviews show first on the board header.
7. **Contacts.** Name, role, company, email, phone, notes, last contact date. A contact can attach to several jobs.
8. **Documents.** Attach the CV version used for each job (from the CV builder) and a cover letter. Files stay on the device.
9. **Reminders.** A next step date per job. Overdue items are listed first. Browser notifications are opt in.
10. **Metrics.** Applications per week, response rate, interview rate, offers, time in each stage. All counts are computed on the device from real entries. No benchmarks against other users until we have real data.
11. **Map view.** Later. Shows employers by distance from home. Needs a geocoding service, so it needs approval for the privacy impact.

## Stepkite extras (why it is better)

- **Country aware.** Salary entered as annual, monthly or CTC. A "what you take home" link opens the pay calculator with the figure filled in.
- **CV link.** "Tailor my CV for this job" opens the builder with the job text. Saved versions are tied to the job.
- **Honest matching (Pro).** The job-ad matcher shows requirements, which ones the CV evidences, and suggests rewording of existing lines only. The user approves each line (CLAUDE.md rule 6).
- **Offer compare.** Two or more offers side by side after tax in the right country.
- **Private by default.** Nothing leaves the device unless the user signs in and turns on sync.

## Data model (IndexedDB, then synced as JSON)

```
Job { id, title, company, location?, url?, source?, salary?: {min?, max?, currency, period},
      stageId, savedAt, appliedAt?, nextStep?: {text, dueAt}, notes, cvId?, coverLetterId?,
      contactIds[], archivedAt?, updatedAt }
Stage { id, name, order, kind: 'saved'|'applied'|'screening'|'interview'|'offer'|'closed' }
Activity { id, jobId, type, text?, at }
Interview { id, jobId, at, kind, people?, prep?, result? }
Contact { id, name, role?, company?, email?, phone?, notes?, lastContactAt? }
```
Validated with zod in `lib/tracker/schema.ts`. Pure functions for metrics in `lib/tracker/metrics.ts`, with tests. Sync reuses the last-write-wins rule in ARCHITECTURE.md and the `jobs` table.

## Limits and pricing

- Free: unlimited jobs on the device. We do not cap the free tracker.
- Pro Pass: sync across devices, unlimited matcher use, offer compare, premium templates.

## Screens

Board, list, job detail (sheet on mobile), add job, contacts, interviews calendar list, metrics, settings (stages, export, delete all).

## Rules that apply

- Worst-case data: 500 jobs, very long titles, no company, no salary, emoji-free text in every language we ship (`break-ui` skill).
- Every action has undo for 10 seconds: move, delete, archive.
- Drag and drop works by keyboard and touch. Targets are at least 44 px.
- Export all data as JSON and CSV. Delete all data in one step.
- No analytics events containing job titles, companies, notes or salaries.

## Milestones

| ROADMAP week | Work |
|---|---|
| 7 | Schema, storage, board and list, add job, timeline, undo |
| 7 | Interviews, contacts, reminders, metrics |
| 7 | Sync, matcher link, CV link |
| Later | Extension, map view, offer compare, calendar export |

## Needs approval

1. Browser extension (new surface, store review, permissions).
2. Reading job pages from a link (privacy and site terms).
3. Map view (geocoding service).
4. Any email or calendar integration.

## Tests

Unit: stage moves, metrics, schema. Component: board drag with mouse, touch and keyboard. End to end: add job, move through stages, log an interview, export, delete all. Offline: edits queue and sync later.

## Lessons from market research

Mechanics only. Nothing here reuses anyone's text, designs or prices.

| Lesson | Stepkite decision |
|---|---|
| Free trackers with no job cap are normal. A cap is a reason to leave. | Unlimited jobs, contacts and documents on the device. Pro sells sync and AI, not space. |
| Import from a spreadsheet is a first-run feature, not an extra. | Add CSV import in the first release, with a column mapping step and a preview. Export is the mirror image. |
| Saving a job from the page you are reading is the habit that makes trackers stick. | Plan the browser extension early (needs approval). Until then, paste a link or text. |
| Statistics, a timeline, tags and reminders are the paid extras elsewhere. | Keep tags, reminders and basic metrics free. They cost us nothing and are what stops people leaving. |
| AI helpers appear as answer, cover letter and summary generators tied to the saved job. | Pro: draft answers to application questions from the user's real CV facts, shown as suggestions the user edits. Never invents experience (CLAUDE.md rule 6). |
| Autofill shows progress such as "10 of 18 fields", and the user stays in control. | If we build autofill, it fills fields and shows a count. The user presses submit. |
| Some products submit applications for you in bulk. | Out of scope. Mass auto-applying produces poor applications and conflicts with our honesty rules. Revisit only with strong user demand and an approval. |
| An hourly job feed pulls repeat visits. | Out of scope for launch. A job feed needs a licensed data source, and CLAUDE.md rule 5 forbids invented vacancies. |
| "People you know at this company" needs the user's contacts or social graph. | Out of scope. It needs sensitive data we do not collect. |
| Pro pricing sits around a few dollars a month for AI extras, with a free tier that is genuinely useful. | Our one-time Pro Pass is cheaper per month than a subscription and never renews on its own. |
| A comparison page (us versus them) is a common SEO page. | Only with sourced, dated facts about other products, and only after launch. Follow RULES 6 and 23. |

Still not visible: the apps themselves (they need a login), their data models and their sync.
