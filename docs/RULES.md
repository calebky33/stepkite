# RULES.md

Rules for building every part of Stepkite so it is simply better than what is on the market. These add to the rules in CLAUDE.md. If two rules clash, CLAUDE.md wins. If a rule clashes with a user request, say so and ask.

## Make it better: the product

1. **Account first, work saved from the first keystroke.** The editor opens behind sign-up or sign-in: email with password, or Google or LinkedIn OAuth. Every draft is saved before any paywall, so a cancel never loses work.
2. **Free is genuinely useful.** A visitor who signs up can build, preview, and export a watermarked PDF from one ATS-safe template. The free template is clean and recruiter-ready, just not the strongest in the pack.
3. **Pay at the moment of value.** The paywall fires on Export PDF, Download, Finish, or any premium template. Not before. Build and preview stay free forever.
4. **The price you see is the price.** No fake countdowns, no invented "was" prices, no rolling "20% off". A discount shows only during a real promotion with a real end time. Every price surface states the next renewal amount and date.
5. **One price list, server-side.** Prices live in the database, not in client code. Never trust the client for price, plan or access. Stripe and the database are the authority.
6. **Honest numbers.** No made-up user counts, ratings, success rates or "recruiters love this". Every figure on a page has a source or a date.
7. **Country first.** Every tool follows local rules: tax year, spelling, CV norms, page size, currency. A UK page never shows US habits.
8. **One job per screen.** Each page answers one question and shows the answer before the explanation.
9. **No hostage data.** A user can always export their own CV and delete everything. Deleting an account removes the data on request within 30 days.
10. **Real support.** Every error says what happened and what to do next. No dead ends.

## Pricing, trial and cancellation (the source of truth)

11. **One source of truth.** Prices and plans sit in a `plans` table with Stripe product and price ids. The pricing page, Checkout and the webhook all read the same row.
12. **Current plan is always visible.** The pricing page and the account page show the signed-in user's current plan, next charge amount, next charge date, and a one-click Cancel button. No digging in menus.
13. **Trial is $1 for 7 days.** Checkout displays, in large text: "Today $1.00. Then $9.99 per month starting [date]. Cancel anytime."
14. **The trial converts to the plan the user picked.** Monthly or yearly, chosen at trial checkout. Never silently default.
15. **One trial per customer.** Enforced per email, per card fingerprint, and per email domain. Disposable email domains are blocked. Stripe Radar is on.
16. **Plans.** Free: build and preview, one ATS template, watermarked PDF. Monthly: $9.99. Yearly: $39 (one charge). Lifetime: $149 one-time. Any limited-time launch tier (for example $79 lifetime) carries a hard cap and a visible end date.
17. **Cancel is one click.** On the account page. No email, no chat. Access runs to the end of the paid period, then revokes. Monthly and yearly are both cancellable at any time with no further charges.
18. **Reminders before every charge.** 48 hours before the trial converts. 48 hours before each annual renewal. For monthly, both an in-app banner and an email, both opt-out but on by default.
19. **Receipts for every charge.** No silent charges. 14-day money-back on yearly and lifetime. The $1 trial is non-refundable. Monthly cancels at period end.
20. **Entitlement is server-side.** Every export is checked server-side. If a PDF is generated in the browser, a paid download must either be rendered server-side or acknowledged in writing as acceptable risk.
21. **Webhook is the single mutator.** Only the Stripe webhook changes a user's `entitlement` row. No "paid" flag ever comes from the client.
22. **Stripe Tax on.** Prices are tax-inclusive in UK, EU and India, tax-exclusive in the US. Shown clearly on the pricing page.
23. **Default currency USD.** Localised prices for UK (GBP) and India (INR) land before each market opens.

## Make it right: the build

24. **Plan, then build.** For anything over two files, write the plan in a few lines first. Ask before any change to the stack, the data model, billing or privacy behaviour.
25. **Smallest complete change.** Reuse what exists (`lib/`, `components/ui`). No speculative features, no config for fixed values.
26. **Pure logic stays pure.** Tax engines, token clamping, promo windows and CV rules are pure functions with tests. UI calls them, never copies them.
27. **Validate every boundary.** zod on every route input and every imported file.
28. **Break it on purpose.** Every screen that shows user data is tested with the worst case: empty, huge, long words, right to left, slow network, offline.
29. **Every async path has three states.** Loading, empty, error. Errors are specific and recoverable.
30. **Measure, don't guess.** Check the performance budget (LCP, CLS, INP, JS size) on every page change. A regression blocks the change.
31. **Accessible by default.** Keyboard works, focus is visible, contrast meets WCAG 2.2 AA, motion respects `prefers-reduced-motion`.
32. **Test the promise.** If a page claims "ATS friendly", a test extracts text from the exported PDF and checks the order. If it claims "estimate", the range is tested against official examples.
33. **Source or it didn't happen.** Rates, rules and legal claims cite an official page and a verified date. No figures from memory.
34. **Secrets stay secret.** Nothing from `.env`, keys or service roles in chat, logs, commits or client code.
35. **Log little.** No personal data, no CV text, no full request bodies in logs.

## Make it ours: originality

36. **Learn mechanics, never copy.** Ideas from other products are fine. Their names, text, images, template designs, prices and statistics are not. Do not name other products in the repo, the UI or the commit log.
37. **Our voice.** All user-facing text follows `docs/VOICE.md` and passes `copy-editor`: plain, specific, local spelling, no dashes in prose, no filler words, no emoji.
38. **Our look.** Follow `docs/DESIGN.md`. No gradients, glass blur, glow, sparkles, stock heroes or rows of identical cards. Depth comes from layered soft shadows, type and spacing.

## Make it stay good: process

39. **One feature per session.** Finish, verify, commit before starting the next.
40. **Reviewers run before merge.** Per the CLAUDE.md table.
41. **project-status-\*** memory updates at session end: what shipped, what is unverified, what is next.
