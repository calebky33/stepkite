# MONETIZATION.md

How Stepkite earns. Pairs with docs/RULES.md pricing section. Nothing here contradicts RULES.md; it describes the shape.

## Flow

```
visit landing / calculator / guide    (open, SEO + sidebar ads)
   └─ click "Build my CV" → anonymous SANDBOX editor
       └─ draft in localStorage only
       └─ at 60 s of typing OR on Save / Export → non-dismissible sign-up banner
   └─ click Sign up / Sign in → auth gate
       └─ Google (1 click), LinkedIn (1 click), email + password (verify email, 60 s)
       └─ anonymous draft (if any) migrates onto the new account

authenticated:
   └─ /{country}/cv  builder (free tier shows sidebar ads, no ads on preview or export)
       └─ click "Start free trial" → 7-day Pro, no card, ads hidden, exports capped at 2/day
       └─ click Export PDF (free) → browser watermarked PDF
       └─ click Export PDF (trial/Pro) → server unwatermarked PDF
       └─ pick a premium template → paywall if not Pro
   └─ /{country}/tracker, /{country}/match: free uses local only; Pro adds sync + metrics + AI

paywall on day 8 (trial end) or on Pro-only click:
   └─ Stripe Checkout: Monthly $9.99 / Yearly $39 / Lifetime $149
       └─ webhook writes entitlement in Supabase
       └─ unlock takes effect on next request
```

Free export: a watermarked PDF rendered in the browser from one ATS-safe template. Trial and Pro: server-rendered PDF or Word from any template.

## Supabase schema (owner creates the project)

```
users               (one row per auth user)
  id uuid pk  (= auth.uid())
  email text unique
  created_at timestamptz default now()

plans               (one source of truth for prices)
  code text pk      ("free"|"trial"|"monthly"|"yearly"|"lifetime")
  stripe_product_id text
  stripe_price_id text
  amount_cents int
  currency text        ("USD"|"GBP"|"INR")
  interval text null   ("day"|"month"|"year"|null for lifetime)
  interval_count int null
  active bool
  notes text

entitlements        (one row per user, server-side truth)
  user_id uuid pk references users(id) on delete cascade
  plan_code text references plans(code)
  status text         ("none"|"trialing"|"active"|"canceled"|"past_due"|"revoked")
  trial_started_at timestamptz null
  trial_ends_at timestamptz null         (set when the 7-day no-card trial starts)
  trial_exports_today int default 0      (reset at midnight UTC; cap of 2 during trial)
  current_period_end timestamptz null
  cancel_at timestamptz null             (when paid access revokes)
  stripe_customer_id text
  stripe_subscription_id text null
  updated_at timestamptz default now()

trial_fingerprints  (one trial per browser + IP; abuse brake)
  fingerprint_hash text pk        (SHA-256 of browser fingerprint)
  ip_hash text                    (SHA-256 of CF-Connecting-IP)
  email_domain text
  started_at timestamptz
  user_id uuid references users(id)

payments            (audit, one row per Stripe event we accepted)
  id uuid pk default gen_random_uuid()
  user_id uuid references users(id)
  event_id text unique    (Stripe event.id, idempotency)
  type text               (invoice.paid, charge.succeeded, etc.)
  amount_cents int
  currency text
  occurred_at timestamptz
  raw jsonb
```

Row-level security: a user reads only their own row in `users` and `entitlements`; writes only through server routes. `plans` is readable by all. `payments` is readable only by the owner through a service role.

## Stripe products (owner creates in dashboard, prices land in `plans` table)

- `prod_trial` → `price_trial` $1.00 USD once, with 7-day free then convert
- `prod_monthly` → `price_monthly` $9.99 USD / month
- `prod_yearly` → `price_yearly` $39.00 USD / year
- `prod_lifetime` → `price_lifetime` $149.00 USD one-time

Localized prices land before each market opens (GBP in UK, INR in India). Stripe Tax is on for every price.

Stripe Radar: enable. Block disposable email domains (list stays server-side in `lib/paywall/blocklist.ts`).

## Routes we add

- `POST /api/auth/signup` email+password sign-up (handled by Supabase JS; this doc is for reference)
- `POST /api/auth/signin`
- `GET  /api/auth/callback` OAuth return (Google, LinkedIn)
- `POST /api/trial/start` starts the 7-day no-card trial; body `{fingerprint}`; checks `trial_fingerprints` for reuse, blocks disposable email domains, writes `trial_ends_at = now + 7 days`
- `POST /api/paywall/checkout` creates a Stripe Checkout session; body `{plan: "monthly"|"yearly"|"lifetime"}`
- `POST /api/paywall/portal` creates a Stripe Billing Portal session for the signed-in user
- `POST /api/stripe/webhook` the only writer to `entitlements` and `payments`
- `GET  /api/export/pdf` entitlement-gated; free = watermarked, trialing or active = unwatermarked; trial increments `trial_exports_today` and refuses after 2
- `GET  /api/export/docx` Pro-only (status in `trialing`, `active`, or plan_code `lifetime`)
- `POST /api/sandbox/migrate` moves an anonymous localStorage draft onto a freshly signed-up account

Client never says "I paid" or "I am on trial". Server reads Supabase. Supabase is written by the webhook, by `/api/trial/start`, and (for `trial_exports_today`) by the export route.

## Pages we add or refresh

- `/sign-in`, `/sign-up` replace stubs. Google, LinkedIn, email+password. `?next=<path>` returns the user to the gated page.
- `/{country}/cv` soft-start sandbox mode for anonymous visitors (draft in localStorage, non-dismissible sign-up banner at 60 s or on save or export). Authenticated users see their own CVs synced via Supabase.
- `/pricing` four cards (Free, Monthly, Yearly, Lifetime). Signed-in Pro users see their current plan, next charge amount, next charge date, and a one-click Cancel button at the top of the page. Signed-in Free users see "Start free trial" at the top.
- `/account` same current-plan panel, plus Email, Password, Linked accounts, Delete my account.

Open pages (no gate, sidebar ads allowed):

- `/` landing with "Build my CV" CTA (soft-start)
- `/{country}/salary-calculator` SEO, ads in sidebar
- `/guides/*` SEO, ads in article body
- `/pricing`, `/about`, `/contact`, `/terms`, `/privacy`, `/cookies`

Gated pages (sign-up required):

- `/{country}/cv` after the sandbox limit
- `/{country}/tracker`
- `/account`, `/billing`
- Any `/api/export/*` route

## Webhook contract

Idempotent. The route stores `event.id` in `payments`; a second delivery of the same id is accepted and dropped.

| Stripe event                  | Entitlement change                                                          |
| ----------------------------- | --------------------------------------------------------------------------- |
| customer.created              | insert `users` row if missing, store `stripe_customer_id` in `entitlements` |
| checkout.session.completed    | mark entitlement status based on the plan                                   |
| customer.subscription.updated | update `status`, `current_period_end`, `cancel_at`                          |
| customer.subscription.deleted | status = `"canceled"`, cancel_at = now                                      |
| invoice.paid                  | append to `payments`, extend `current_period_end`                           |
| invoice.payment_failed        | status = `"past_due"`                                                       |
| charge.refunded               | status = `"revoked"` when full refund                                       |

Reminders ride on top:

- Trial-conversion reminder email at `current_period_end - 48h`.
- Annual renewal reminder at `current_period_end - 48h`.
- Monthly: both an email (opt-out, on by default) and an in-app banner from `current_period_end - 48h` to `current_period_end`.

## Trust rules in code

- Checkout session includes `subscription_data.description = "Today $1.00. Then $9.99 / month starting <date>. Cancel anytime."` and the trial end date is confirmed in the success page.
- `/api/paywall/portal` link is one click from the account page.
- Receipts: Stripe sends them. We also store the audit row in `payments`.
- Refunds: `/api/paywall/refund` opens a mailto when a user requests one within the money-back window; the owner approves and refunds in Stripe.

## Not in this build (defer to a future session)

- Localized prices (GBP, INR) land before each market opens.
- Server-rendered PDF via puppeteer-core on a Worker (free is browser-side; paid lands server-side when the Worker + puppeteer path is proven).
- Team or multi-seat.
- Referral or affiliate program.

## Owner steps before the first build session

1. Create a Supabase project; copy `anon` key and service role key to secrets.
2. Create Stripe products and prices listed above; copy ids into the `plans` table.
3. Add Google and LinkedIn OAuth apps to Supabase Auth settings.
4. Set webhook endpoint `/api/stripe/webhook` and copy signing secret.
5. Set GitHub Actions secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `STRIPE_PUBLIC_KEY`. Set Worker secrets: `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.

The build session cannot start until step 1 and step 2 are complete.
