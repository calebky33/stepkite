# ARCHITECTURE.md

Static-first. Server only for auth, sync, payments, AI.

## Layout
```
app/
  [country]/                 uk | us | in (generateStaticParams)
    salary-calculator/       SSG landing + tool
    salary/[amount]/         SSG salary-level pages (selected amounts only)
    cv/                      CV builder (client)
    tracker/                 job tracker (client)
    guides/[slug]/           MDX
  api/
    checkout/route.ts        create Stripe Checkout session
    stripe/webhook/route.ts  verify signature, grant Pro
    match/route.ts           AI job-ad matching (auth + rate limit)
    og/route.tsx             share images
  sitemap.ts, robots.ts
lib/
  tax/{uk,us,in}/            pure engines + rates.<year>.ts + tests
  cv/                        schema.ts (zod), rules/<country>.ts, pdf.ts, phrases.ts
  storage/                   IndexedDB (idb-keyval) wrapper; sync adapter
  supabase/                  server + browser clients
  pro.ts                     entitlement check
components/{ui,tools}/
content/<country>/*.mdx
```

## Data
- Free users: everything in IndexedDB. No account.
- Signed-in sync: Supabase tables `profiles`, `cvs (id, user_id, data jsonb, updated_at)`, `jobs`, `entitlements (user_id, kind, expires_at, stripe_session_id)`. RLS on every table: `user_id = auth.uid()`.
- Conflict rule for sync: last-write-wins by `updated_at`, keep one previous version.

## Payments
- Pro Pass: Stripe Checkout `mode=payment`, price per currency (GBP, USD, INR). Webhook `checkout.session.completed` → insert entitlement with `expires_at = now + 30d`. Idempotent on session id.
- Annual: `mode=subscription`, explicit opt-in, cancel link in account.
- Stripe Tax enabled on Checkout. No card data touches our servers.

## AI matching
- Server route only; key in env. zod-validate input; cap job-ad and CV text length; per-user and per-IP rate limit; free = 1/month.
- Prompt returns structured JSON: requirements, which are evidenced, suggested rewording of EXISTING lines only. UI shows diffs; user accepts each.

## Hosting
Cloudflare Workers via OpenNext. Verify in week 1: SSG, route handlers, OG images, middleware. Avoid features the adapter does not support (check docs, don't assume).

## Security checklist
zod on every route input · auth + ownership check on every record · rate limits · secrets in env only · webhook signature verification · CSP headers · no PII in logs · daily DB backups.
