# MONETIZATION.md

How Stepkite earns. Pairs with docs/RULES.md pricing section. Nothing here contradicts RULES.md; it describes the shape.

Provider: **Paystack**. USD only at launch because Paystack does not support GBP or INR. A second provider may be added later for GBP and INR without changing the pattern here.

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
   └─ Paystack hosted checkout: Monthly $9.99 / Yearly $39 / Lifetime $149
       └─ our server calls /transaction/initialize, returns authorization_url
       └─ customer pays on Paystack, is redirected back to callback_url
       └─ webhook writes entitlement in Supabase on charge.success
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
  paystack_plan_code text null   (PLN_... for recurring; null for lifetime one-off)
  amount_cents int
  currency text        ("USD" only at launch)
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
  paystack_customer_code text
  paystack_subscription_code text null
  updated_at timestamptz default now()

trial_fingerprints  (one trial per browser + IP; abuse brake)
  fingerprint_hash text pk        (SHA-256 of browser fingerprint)
  ip_hash text                    (HMAC-SHA256 of CF-Connecting-IP with a server-side pepper)
  email_domain text
  started_at timestamptz
  user_id uuid references users(id)

payments            (audit, one row per Paystack event we accepted)
  id uuid pk default gen_random_uuid()
  user_id uuid references users(id)
  event_id text unique    (Paystack event id, idempotency)
  type text               (charge.success, invoice.paid, etc.)
  amount_cents int
  currency text
  occurred_at timestamptz
  raw jsonb
```

Row-level security: a user reads only their own row in `users` and `entitlements`; writes only through server routes. `plans` is readable by all. `payments` is readable only by the owner through a service role.

## Paystack products (owner creates in dashboard, codes land in `plans` table)

Create two subscription **plans** and one one-off **product** on Paystack, all in USD:

- Monthly plan → interval `monthly`, amount `999` (kobo = cents) → copy `plan_code` into `plans.paystack_plan_code` for `code='monthly'`.
- Yearly plan → interval `annually`, amount `3900` → copy into `plans.paystack_plan_code` for `code='yearly'`.
- Lifetime: no Paystack plan needed. Keep `paystack_plan_code` null; the checkout route initialises a one-time transaction for $149 (`14900` cents).

USD on Paystack requires the merchant account to be in Nigeria or Kenya and to pass Paystack's USD activation step (see OWNER-SETUP.md section 2.1).

Paystack has no equivalent to Stripe Radar or Stripe Tax. We instead:

- block disposable email domains in `lib/paywall/blocklist.ts` before `/api/trial/start`,
- rate-limit `/api/auth/*` and `/api/paywall/*` (WAF, see DEPLOY.md),
- include VAT or GST in the displayed price in the UK, EU and India and flag that on the pricing page.

## Routes we add

- `POST /api/auth/signup` email+password sign-up (handled by Supabase JS; this doc is for reference)
- `POST /api/auth/signin`
- `GET  /api/auth/callback` OAuth return (Google, LinkedIn)
- `POST /api/trial/start` starts the 7-day no-card trial; body `{fingerprint}`; checks `trial_fingerprints` for reuse, blocks disposable email domains, writes `trial_ends_at = now + 7 days`
- `POST /api/paywall/checkout` calls `/transaction/initialize` on Paystack; body `{plan: "monthly"|"yearly"|"lifetime"}`; returns `{authorization_url}` for the browser to redirect to
- `POST /api/paywall/cancel` disables the signed-in user's Paystack subscription (replaces the Stripe Billing Portal pattern). Access runs to `current_period_end`.
- `POST /api/paystack/webhook` the only writer to `entitlements` and `payments`
- `GET  /api/export/pdf` entitlement-gated; free = watermarked, trialing or active = unwatermarked; trial increments `trial_exports_today` and refuses after 2
- `GET  /api/export/docx` Pro-only (status in `trialing`, `active`, or plan_code `lifetime`)
- `POST /api/sandbox/migrate` moves an anonymous localStorage draft onto a freshly signed-up account

Client never says "I paid" or "I am on trial". Server reads Supabase. Supabase is written by the webhook, by `/api/trial/start`, and (for `trial_exports_today`) by the export route.

## Pages we add or refresh

- `/sign-in`, `/sign-up` replace stubs. Google, LinkedIn, email+password. `?next=<path>` returns the user to the gated page.
- `/{country}/cv` soft-start sandbox mode for anonymous visitors (draft in localStorage, non-dismissible sign-up banner at 60 s or on save or export). Authenticated users see their own CVs synced via Supabase.
- `/pricing` four cards (Free, Monthly, Yearly, Lifetime). Signed-in Pro users see their current plan, next charge amount, next charge date, and a one-click Cancel button at the top of the page. Signed-in Free users see "Start free trial" at the top. One line on the page: "Prices are in USD. VAT or GST, where it applies, is included."
- `/account` same current-plan panel, plus Email, Password, Linked accounts, Cancel plan, Delete my account.

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

Implemented in `lib/billing/paystackWebhook.ts`, called by `app/api/paystack/webhook/route.ts` after the signature check. Signature verification uses `Paystack-Signature` (current scheme: HMAC-SHA512 of `<t>.<kid>.<body>` with the `whsec_...` signing secret, 300 second tolerance on `t`) with a fallback to the legacy `x-paystack-signature` header (HMAC-SHA512 of the raw body with the secret key). Only `PAYSTACK_SECRET_KEY` is required.

Rules the code follows:

- **Grant first, record second.** Every write is idempotent. The event is written to `payments(event_id unique)` last and only means "done", so a crash or a retry in between applies the same write again. Nothing is deleted to undo a failed write.
- **Money is never trusted from the body.** `charge.success` re-fetches the transaction from Paystack and checks status, USD, the plan code and the exact amount against the `plans` row.
- **Retry versus ignore.** The route answers 200 for applied, duplicate and ignored events and 500 (Paystack retries) when the row an event points at is not there yet or the `plans` table disagrees with a real payment. Ignored means not ours, not paid, or the account is gone.
- **Lifetime is protected.** An older subscription event cannot cancel or downgrade a lifetime plan, and a time-limited payment on a lifetime account is recorded and flagged for a manual refund.
- **No revival.** A renewal that arrives after a plan was cancelled or revoked does not bring it back. A new checkout (it carries our metadata) does.
- **Refunds are manual.** Refund events are acknowledged and ignored. Refund in the Paystack dashboard and change the entitlement by hand if access should end.

| Paystack event         | Entitlement change                                                                                                                                  |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| charge.success         | verified paid charge: plan active, customer code stored, `current_period_end` = now plus the plan interval (none for lifetime), `cancel_at` cleared |
| subscription.create    | store `paystack_subscription_code` and `current_period_end` from `next_payment_date`; retried until the first charge has landed                     |
| subscription.not_renew | set `cancel_at = current_period_end`; access continues                                                                                              |
| subscription.disable   | paid up: set `cancel_at = current_period_end`, stay active. Period already over: status `canceled`, `cancel_at` now                                 |
| invoice.payment_failed | status `past_due` (never for lifetime)                                                                                                              |

`hasProAccess` ends access at `cancel_at` and allows three extra days after `current_period_end` for a delayed renewal.

Reminders ride on top:

- Trial-conversion reminder email at `trial_ends_at - 48h`.
- Annual renewal reminder at `current_period_end - 48h`.
- Monthly: both an email (opt-out, on by default) and an in-app banner from `current_period_end - 48h` to `current_period_end`.

## Trust rules in code

- The authorization URL from Paystack is the single success path; we never POST card data ourselves.
- `/api/paywall/cancel` is one click from the account page.
- Receipts: Paystack sends them. We also store the audit row in `payments`.
- Refunds: `/api/paywall/refund` opens a mailto when a user requests one within the money-back window; the owner approves and refunds in the Paystack dashboard.

## Not in this build (defer to a future session)

- A second provider (Stripe or similar) to accept GBP in the UK and INR in India.
- Server-rendered PDF via puppeteer-core on a Worker (free is browser-side; paid lands server-side when the Worker + puppeteer path is proven).
- Team or multi-seat.
- Referral or affiliate program.

## Owner steps before the first build session

1. Create a Supabase project; copy `anon` key and service role key to secrets.
2. Create a Paystack account (NG or KE merchant), activate USD, create the two plans and the lifetime product listed above, and copy the plan codes into the `plans` table.
3. Add Google and LinkedIn OAuth apps to Supabase Auth settings.
4. Set webhook endpoint `/api/paystack/webhook` in the Paystack dashboard and copy the signing secret (`whsec_...`) into the Worker.
