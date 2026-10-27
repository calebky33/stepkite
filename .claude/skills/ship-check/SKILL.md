---
name: ship-check
description: Pre-merge and pre-deploy gate — build, tests, code review, copy humanizing, design polish, a11y, performance, privacy, and tax freshness. Use for "/ship-check", "ready to merge?", or before any deploy.
---

# Ship check

Run 1 to 3 in parallel, then 4 to 8.

1. `test-runner`: `pnpm typecheck && pnpm lint && pnpm check:copy && pnpm test && pnpm build`.
2. Reviews on the current diff, in parallel: `reviewer`, plus `typescript-reviewer` for any TS or JS, `react-reviewer` for any .tsx, `security-reviewer` if auth, payments, webhooks, CV data, AI routes or secrets changed, `database-reviewer` if SQL, Supabase or RLS changed.
3. Copy: `copy-editor` on changed UI and content files (it applies the `humanizer` skill).
4. Design polish on changed UI: `emil-design-eng` review table; `review-animations` if any transition or animation changed; `break-ui` on any new list, card, or result screen; `mobile-native` baseline on any new page.
5. **Bundle:** check build output; any calculator route > 90KB gz first-load JS = BLOCKING.
6. **Tax freshness:** Grep `verifiedOn` in `lib/tax/`; any date older than 90 days or before the latest budget = SHOULD FIX.
7. **Privacy:** Grep for `console.log`, analytics calls, or `fetch(` inside `lib/cv/` and `components/tools/cv/`; anything sending CV data without sync opt-in = BLOCKING.
8. **E2E (if UI changed):** `pnpm e2e` for affected flows.

Output one table: check | pass/fail | action. List every agent and skill that ran. End with "Ship" or "Do not ship". Any BLOCKING item, or a skipped required check, means "Do not ship".
