-- Stepkite initial schema. Signed-in sync, accounts and payment records only.
-- Free users never touch this database (docs/ARCHITECTURE.md).

-- profiles/updated_at: the server clock decides.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Synced rows (cvs, jobs): last write wins by the client's updated_at, so an
-- edit made offline and synced late cannot overwrite a newer edit from another
-- device. server_updated_at is always the server clock and cannot be set by clients.
create or replace function public.sync_lww()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Never trust a clock far in the future.
  new.updated_at = least(coalesce(new.updated_at, now()), now() + interval '5 minutes');
  new.server_updated_at = now();
  if tg_op = 'UPDATE' then
    -- A stale write loses: skip it. The client re-reads and merges.
    if new.updated_at < old.updated_at then
      return null;
    end if;
    new.created_at = old.created_at;
    new.user_id = old.user_id;
  end if;
  return new;
end;
$$;

-- cvs only: keep exactly one previous version, set by the server so clients cannot forge it.
create or replace function public.cvs_keep_prev()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.prev_data = null;
  elsif new.data is distinct from old.data then
    new.prev_data = old.data;
  else
    new.prev_data = old.prev_data;
  end if;
  return new;
end;
$$;

-- profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  country text check (country in ('uk', 'us', 'in')),
  locale text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create a profile row for every new sign-up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- cvs: last write wins, one previous version kept.
create table public.cvs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  data jsonb not null,
  prev_data jsonb,
  schema_version int not null default 1,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default now(),
  constraint cvs_data_size check (octet_length(data::text) < 524288)
);

create index cvs_user_updated_idx on public.cvs (user_id, updated_at desc);

create trigger cvs_keep_prev
  before insert or update on public.cvs
  for each row execute function public.cvs_keep_prev();

create trigger cvs_sync_lww
  before insert or update on public.cvs
  for each row execute function public.sync_lww();

-- jobs: one row per tracked application (docs/TRACKER-SPEC.md).
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default now(),
  constraint jobs_data_size check (octet_length(data::text) < 65536)
);

create index jobs_user_updated_idx on public.jobs (user_id, updated_at desc);

create trigger jobs_sync_lww
  before insert or update on public.jobs
  for each row execute function public.sync_lww();

-- plans: one row per Paystack product/plan; readable by everyone. Stepkite displays prices in
-- USD (currency column) but Paystack is on a Kenya merchant account and actually charges in
-- KES (paystack_amount_kobo column). The display currency check is a hard single value, not a
-- set, until a second provider lands.
create table public.plans (
  code text primary key check (code in ('free', 'trial', 'monthly', 'yearly', 'lifetime')),
  -- Paystack recurring plans only. One-time plans (lifetime) leave paystack_plan_code null and
  -- are initialized by amount alone.
  paystack_plan_code text,
  amount_cents int not null default 0,
  currency text not null default 'USD' check (currency = 'USD'),
  -- The KES amount Paystack actually charges, in kobo (1 KES = 100 kobo). Zero on free.
  -- See lib/billing/plans.ts for the USD→KES calibration and its date.
  paystack_amount_kobo int not null default 0 check (paystack_amount_kobo >= 0),
  interval text check (interval in ('day', 'month', 'year')),
  interval_count int,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

-- Webhook maps Paystack plan code back to plan code. Unique keeps that mapping 1:1.
create unique index plans_paystack_plan_uniq on public.plans (paystack_plan_code)
  where paystack_plan_code is not null;

-- Seed the free row. Paid plans are inserted once the owner has Paystack plan codes.
insert into public.plans (code, amount_cents, currency, active, notes)
values ('free', 0, 'USD', true, 'Default plan for every signed-in user')
on conflict do nothing;

-- entitlements: one row per user. Only the Paystack webhook and /api/trial/start write.
create table public.entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan_code text not null default 'free' references public.plans (code) on delete restrict,
  status text not null default 'none'
    check (status in ('none', 'trialing', 'active', 'canceled', 'past_due', 'revoked')),
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  trial_exports_today int not null default 0 check (trial_exports_today >= 0),
  trial_exports_date date,
  current_period_end timestamptz,
  cancel_at timestamptz,
  paystack_customer_code text,
  paystack_subscription_code text unique,
  updated_at timestamptz not null default now()
);

-- One Paystack customer maps to one user. Partial unique prevents webhook "update by customer"
-- from silently hitting several rows if a bug lets two users share a customer code.
create unique index entitlements_customer_uniq on public.entitlements (paystack_customer_code)
  where paystack_customer_code is not null;

create trigger entitlements_set_updated_at
  before update on public.entitlements
  for each row execute function public.set_updated_at();

-- Create a free entitlement row for every new sign-up.
create or replace function public.handle_new_entitlement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.entitlements (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_entitlement() from public, anon, authenticated;

create trigger on_auth_user_created_entitlement
  after insert on auth.users
  for each row execute function public.handle_new_entitlement();

-- trial_fingerprints: one trial per browser+IP; abuse brake for /api/trial/start.
-- ip_hash MUST be an HMAC-SHA256 with a server-side pepper (not a plain SHA-256):
-- IPv4 space is small enough that a plain hash is reversible offline in seconds.
-- The pepper lives only in the Worker env (TRIAL_IP_PEPPER); it is never read client-side.
create table public.trial_fingerprints (
  fingerprint_hash text primary key,
  ip_hash text not null,
  email_domain text,
  user_id uuid references auth.users (id) on delete set null,
  started_at timestamptz not null default now()
);

create index trial_fingerprints_ip_idx on public.trial_fingerprints (ip_hash);

-- payments: Paystack event audit log; event_id gives webhook idempotency.
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  event_id text not null unique,
  type text not null,
  amount_cents int not null default 0,
  currency text not null default 'USD',
  occurred_at timestamptz not null default now(),
  raw jsonb not null default '{}'::jsonb
);

create index payments_user_occurred_idx on public.payments (user_id, occurred_at desc);

-- Row level security: every table, no exceptions.
alter table public.profiles enable row level security;
alter table public.cvs enable row level security;
alter table public.jobs enable row level security;
alter table public.plans enable row level security;
alter table public.entitlements enable row level security;
alter table public.trial_fingerprints enable row level security;
alter table public.payments enable row level security;

create policy "profiles: owner reads" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "profiles: owner updates" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "cvs: owner reads" on public.cvs
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "cvs: owner inserts" on public.cvs
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "cvs: owner updates" on public.cvs
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "cvs: owner deletes" on public.cvs
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "jobs: owner reads" on public.jobs
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "jobs: owner inserts" on public.jobs
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "jobs: owner updates" on public.jobs
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "jobs: owner deletes" on public.jobs
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Plans: everyone can read active plans (pricing page needs them).
create policy "plans: anyone reads active" on public.plans
  for select to anon, authenticated using (active = true);

-- Entitlements: read only for the owner. No insert, update or delete policy,
-- so only the service role (webhook + /api/trial/start) can change them.
create policy "entitlements: owner reads" on public.entitlements
  for select to authenticated using ((select auth.uid()) = user_id);

-- trial_fingerprints and payments: service role only. No authenticated policy,
-- so RLS blocks every read and write except through the service key.

-- Least privilege. The anonymous role gets nothing beyond active plans; future tables default to nothing.
revoke all on public.profiles, public.cvs, public.jobs, public.entitlements, public.trial_fingerprints, public.payments from anon;
grant select on public.plans to anon;
alter default privileges in schema public revoke all on tables from anon, authenticated;
revoke truncate, references, trigger on public.profiles, public.cvs, public.jobs, public.entitlements, public.plans, public.trial_fingerprints, public.payments from authenticated;
revoke insert, update, delete on public.entitlements, public.plans, public.trial_fingerprints, public.payments from authenticated;
-- Belt and braces: strip SELECT on service-role-only tables so RLS is not the sole guard.
revoke select on public.trial_fingerprints, public.payments from authenticated;
