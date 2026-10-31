# DEPLOY.md

How Stepkite reaches production with no downtime. Hosting is a Cloudflare Worker named `stepkite`, built with OpenNext. `scripts/hooks/guard.mjs` enforces the order below for Claude sessions, and the same order applies to anyone deploying by hand.

## Rules

1. Nothing ships in one step. No `wrangler deploy`. Upload a version, check it, then move traffic in steps.
2. Nothing ships without a fresh `node scripts/preflight.mjs` for the current commit (typecheck, lint, copy check, tests, audit, build).
3. Nothing reaches 100% without a passing `node scripts/smoke.mjs` on the new version in the last 30 minutes.
4. Database changes are backward compatible first (add, then switch, then remove), because two versions run at once during a rollout.
5. Secrets are set by the owner in Cloudflare and Supabase settings. They are never typed in chat, committed or put in `NEXT_PUBLIC_*`.

## Steps

```
git status                      # clean, committed
node scripts/preflight.mjs      # stop pnpm dev first; writes .claude/.preflight-ok
pnpm exec opennextjs-cloudflare upload     # creates a version, serves no traffic
node scripts/smoke.mjs https://<version preview url>   # prints the version id it checked
pnpm exec wrangler versions deploy <new>@10 <current>@90
# watch errors and latency for a few minutes (Cloudflare dashboard, wrangler tail)
pnpm exec wrangler versions deploy <new>@50 <current>@50
pnpm exec wrangler versions deploy <new>@100
```

Smoke reads the Worker version id from `/api/health` and stores it with the time. The guard only lets a 100% promotion through when the command names that same id, so use the id smoke printed for `<new>`. Smoke also checks HTTPS only, no IP or localhost, the nonce CSP on HTML pages, HSTS and nosniff.

## Rollback

```
pnpm exec wrangler deployments list --name stepkite     # find the last good version
pnpm exec wrangler rollback <version id>                # instant, no rebuild
```

Rollback is always allowed. After it, open the cause as a bug before the next attempt.

## Health

`GET /api/health` returns `{ "status": "ok", "version": "<worker version id or null>" }` with no database or third party call. Use it for the uptime monitor. A page check (`/uk/salary-calculator`) catches a bad build that the health route would not.

## Open items (need the owner's Cloudflare account)

- A Rate Limiting rule on `/api/job-preview` and `/api/newsletter` keyed on the caller's address. The in-code guard is per instance and only a backstop.
- An uptime monitor on `/api/health` and one calculator page, with an alert to the owner.
- Confirm the Worker sees the public host (`request.url`) so the job preview Origin check and self-host block use the right name.
- Security headers are set (`next.config.ts`, and the CSP in `proxy.ts`). The CSP is enforced. See Security headers below.
- Bot protection (Turnstile and WAF). See Bot protection below.

## Bot protection

Three layers, owner-side setup:

1. **Turnstile widget on the newsletter form** (code is in). Create a widget at https://dash.cloudflare.com, Turnstile, Add site, mode Managed, domains `stepkite.com` plus any staging host. Copy the sitekey and secret. Set the sitekey as a build-time variable in GitHub Actions secrets: `NEXT_PUBLIC_TURNSTILE_SITEKEY`. Set the secret on the Worker: `wrangler secret put TURNSTILE_SECRET` (and `TURNSTILE_HOSTNAMES` as a plain variable, comma-separated allowlist of frontend hostnames). Without the sitekey the widget does not render and the server skips verification, so the newsletter still works until the owner sets them.
2. **Bot Fight Mode** (free). Dashboard, stepkite zone, Security, Bots, toggle Bot Fight Mode. Blocks known bots on every route with no code change.
3. **WAF Rate Limiting rule** (free tier gets a few). Dashboard, Security, WAF, Rate limiting rules. Add one rule per path: `/api/job-preview` 10 req/min per IP, `/api/newsletter` 5 req/min per IP, action Block. Match on URI Path.

TLS fingerprint (JA3 or JA4) blocking is a WAF Custom Rule, same screen, if more bot abuse appears after launch.

## Security headers

`next.config.ts` sets HSTS (no preload yet), nosniff, referrer policy, permissions policy, X-Frame-Options and COOP. `proxy.ts` sets the nonce CSP from `lib/security/csp.ts` as an enforced `Content-Security-Policy` in every environment. There is no report endpoint, so a blocked resource shows only in the browser console. Check every new preview version (`node scripts/smoke.mjs`, then the checkout page and a calculator in a browser) for console errors before it takes traffic. A policy change is never rolled out straight to 100%.

## Rate limits

`wrangler.jsonc` `ratelimits` binds `RL_JOB_PREVIEW` (10 per minute) and `RL_NEWSLETTER` (5 per minute), keyed on `CF-Connecting-IP`. The namespace ids are placeholders; keep them unique in the account. Use `rateLimit(request, name)` from `lib/rateLimit.ts`. It allows the call when the binding is missing or throws.

## Guardrails are not a security boundary

`scripts/hooks/guard.mjs` stops accidents. It cannot stop a determined caller, because a shell command can be spelled in more ways than any filter lists. The real control is the Cloudflare API token the machine holds. Owner: create a token limited to this one account and zone with only Workers Scripts Edit (add Workers KV or rate limit rights only if needed), and no DNS, account settings, API token or billing rights. Keep any broader token off this machine, and rotate the narrow one if it ever appears in a log.

## Static asset headers

Files served straight from the assets binding bypass the Worker, so `next.config.ts` and `proxy.ts` never run for them. `public/_headers` covers them (`/_next/static/*`, `/favicon.ico`, `/icon.svg`, `/brand/*`): nosniff, HSTS and referrer policy, plus a long immutable cache on `/_next/static/*` only. Add a rule there for any new folder in `public/`.

## Rate limit accuracy

Workers rate limits are counted per Cloudflare location and are approximate, so treat them as abuse damping, not an exact quota. A request without a valid `CF-Connecting-IP` skips the Cloudflare limiter and relies on the in-process guard. `/api/job-preview` fails closed (a binding error, or a missing binding in production, refuses the call). `/api/newsletter` fails open.
