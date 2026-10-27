# START HERE — Stepkite

## Open the project
1. Open `C:\Users\USER\stepkite` in Claude Code. CLAUDE.md, agents, skills, hooks and settings load automatically.
2. Check: `/agents` lists the 6 project agents (plus the global reviewers). `/` shows 9 project skills: new-calculator, cv-template, ui-component, ship-check, humanizer, emil-design-eng, review-animations, break-ui, mobile-native. `/hooks` shows the after-edit hook.
3. Before building: register stepkite.com, run a trademark search, and create Stripe, Supabase and Cloudflare accounts yourself. Keep keys in `.env` (Claude is blocked from reading it).

## How "human, no errors" is enforced
- docs/VOICE.md sets the voice. The `humanizer` skill removes AI writing patterns. `copy-editor` applies both.
- After every edit, a hook formats the file and checks its text. Problems go straight back to Claude to fix.
- `pnpm build` fails if any banned phrase, emoji, dash, or slash slips into user-facing text.
- `emil-design-eng`, `review-animations`, `break-ui` and `mobile-native` keep the UI from looking or feeling AI-generated.
- `reviewer` plus the global `typescript-reviewer`, `react-reviewer`, `security-reviewer` and `database-reviewer` check code before merge. CLAUDE.md says which must run for each kind of change.
- Still read the screens yourself before launch. A checker catches patterns, not taste.

## Session rules that save tokens and time
- One feature per session. `/clear` between features; `/compact` if a session gets long.
- Use Plan mode (Shift+Tab) for anything bigger than one file, approve the plan, then let it run.
- Name the files when you know them ("edit components/tools/PayCalculator/UkForm.tsx").
- Let agents do heavy lifting: they return short summaries, so your main context stays small.
- Sonnet for most building; `reviewer` uses Opus; `test-runner` uses Haiku.
- RTK (installed globally) compresses command output; `rtk gain` shows savings. Caveman keeps chat replies short, never site text.

## Copy-paste prompts, in order
1. `Read docs/ARCHITECTURE.md, docs/DESIGN.md, docs/BRAND.md and docs/VOICE.md. Scaffold the project per CLAUDE.md stack. In package.json add "check:copy": "node scripts/check-copy.mjs" and make "build" run check:copy first. Install prettier as a dev dependency. Set up design tokens, next/font for Inter and Plus Jakarta Sans, the brand SVGs as favicon and header logo, and components/ui primitives with a dev gallery. Deploy a hello-world to Cloudflare via OpenNext. Use ui-builder for components, copy-editor for all text, and test-runner to verify.`
2. `/new-calculator uk`
3. `/new-calculator in`
4. `Build the CV builder core per docs/ARCHITECTURE.md (schema, IndexedDB storage, editor, live preview, PDF export). Plan first.`
5. `/cv-template uk` then `/cv-template us` then `/cv-template in`
6. `Build the job tracker per docs/DESIGN.md.`
7. `Add Supabase auth + sync with RLS, then Stripe Checkout Pro Pass with webhook and entitlements, per docs/ARCHITECTURE.md. Plan first.`
8. `Add AI job-ad matching per docs/ARCHITECTURE.md.`
9. `/ship-check`

After each: tick it in docs/ROADMAP.md and commit (Claude asks before committing).

## Third-party skills
`humanizer` (MIT, github.com/blader/humanizer) and `emil-design-eng`, `review-animations`, `break-ui`, `mobile-native` (MIT, github.com/emilkowalski/skills), copied 2026-10-26 and read in full before install. Only change made: removed `disable-model-invocation` from review-animations so agents and /ship-check can run it. Licences are in each skill folder.
