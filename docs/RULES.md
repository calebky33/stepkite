# RULES.md

Rules for building every part of Stepkite so it is simply better than what is on the market. These add to the rules in CLAUDE.md. If two rules clash, CLAUDE.md wins. If a rule clashes with a user request, say so and ask.

## Make it better: the product

1. **Pay once, no traps.** The Pro Pass is a one-time payment. Annual billing is opt-in with a visible cancel link. No auto-renew surprises, no price that changes at checkout.
2. **The price you see is the price.** No fake countdowns, no invented "was" prices, no rolling "20% off". A discount shows only while a real promotion runs, and it ends at the real time.
3. **Work first, ask later.** A visitor can build and download a CV without an account. Sign-in only adds sync and sharing.
4. **No hostage data.** A user can always export their own CV and delete everything. Deleting an account removes the data.
5. **Private by default.** CV text stays on the device unless the user signs in and turns on sync, or chooses an AI feature. Say what is sent, before it is sent.
6. **Honest numbers.** No made-up user counts, ratings, success rates or "recruiters love this". Every figure on a page has a source or a date.
7. **Country first.** Every tool follows local rules: tax year, spelling, CV norms, page size, currency. A UK page never shows US habits.
8. **One job per screen.** Each page answers one question and shows the answer before the explanation.
9. **Free tools must be good.** The calculators and the basic CV are genuinely useful without paying. Pro adds convenience and extras. It never holds basic results back.
10. **Real support.** Every error says what happened and what to do next. No dead ends.

## Make it right: the build

11. **Plan, then build.** For anything over two files, write the plan in a few lines first. Ask before any change to the stack, the data model, billing or privacy behaviour.
12. **Smallest complete change.** Reuse what exists (`lib/`, `components/ui`). No speculative features, no config for fixed values.
13. **Pure logic stays pure.** Tax engines, token clamping, promo windows and CV rules are pure functions with tests. UI calls them, never copies them.
14. **Validate every boundary.** zod on every route input and every imported file. Never trust the client for price, plan or access. Stripe and the database are the authority.
15. **Break it on purpose.** Every screen that shows user data is tested with the worst case: empty, huge, long words, right to left, slow network, offline.
16. **Every async path has three states.** Loading, empty, error. Errors are specific and recoverable.
17. **Measure, don't guess.** Check the performance budget (LCP, CLS, INP, JS size) on every page change. A regression blocks the change.
18. **Accessible by default.** Keyboard works, focus is visible, contrast meets WCAG 2.2 AA, motion respects `prefers-reduced-motion`.
19. **Test the promise.** If a page claims "ATS friendly", a test extracts text from the exported PDF and checks the order. If it claims "estimate", the range is tested against official examples.
20. **Source or it didn't happen.** Rates, rules and legal claims cite an official page and a verified date. No figures from memory.
21. **Secrets stay secret.** Nothing from `.env`, keys or service roles in chat, logs, commits or client code.
22. **Log little.** No personal data, no CV text, no full request bodies in logs.

## Make it ours: originality

23. **Learn mechanics, never copy.** Ideas from other products are fine. Their names, text, images, template designs, prices and statistics are not. Do not name other products in the repo, the UI, the docs or commit messages.
24. **Our voice.** All user-facing text follows `docs/VOICE.md` and passes `copy-editor`: plain, specific, local spelling, no dashes in prose, no filler words, no emoji.
25. **Our look.** Follow `docs/DESIGN.md`. No gradients, glass blur, glow, sparkles, stock heroes or rows of identical cards. Depth comes from layered soft shadows, type and spacing. Why: the owner asked for a premium look and relaxed the earlier flat rule on shadows and display type.

## Make it stay good: process

26. **Review before done.** Run the agents and skills in the CLAUDE.md table. Fix every blocking finding. List what is left.
27. **One feature, one session.** Keep context small. Compact at 60%.
28. **Ship small, ship often.** Each merge passes typecheck, lint, `check:copy`, tests and `pnpm build`. Check 375 px and 1280 px, light and dark.
29. **Validate with people.** Nothing is "done" for a market until real strangers have finished the task. The week 8 gate in ROADMAP.md is a hard gate.
30. **Write down decisions.** If a rule changes, edit this file in the same change and say why in one line.

## Make it safe

31. **Never trust the visitor's clock or the client for money.** Deadlines, prices and access are decided by the server and Stripe. The browser only displays them.
32. **User content renders in a sandbox.** Previews and shared CVs load from a separate route with strict CSP and no access to app cookies or storage.
33. **No personal data in cookies or error reports.** Preferences only. Scrub CV text, emails and salary values before anything is logged or sent to an error tracker.
