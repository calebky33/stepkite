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

-- entitlements: written only by the Stripe webhook (service role), read by the owner.
create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('pro_pass', 'annual', 'student')),
  expires_at timestamptz not null,
  stripe_session_id text unique,
  stripe_subscription_id text unique,
  created_at timestamptz not null default now()
);

create index entitlements_user_idx on public.entitlements (user_id, expires_at desc);

-- Row level security: every table, no exceptions.
alter table public.profiles enable row level security;
alter table public.cvs enable row level security;
alter table public.jobs enable row level security;
alter table public.entitlements enable row level security;

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

-- Entitlements: read only for the owner. No insert, update or delete policy,
-- so only the service role (webhook) can change them.
create policy "entitlements: owner reads" on public.entitlements
  for select to authenticated using ((select auth.uid()) = user_id);

-- Least privilege. The anonymous role gets nothing, now or on future tables.
revoke all on public.profiles, public.cvs, public.jobs, public.entitlements from anon;
alter default privileges in schema public revoke all on tables from anon;
revoke truncate, references, trigger on public.profiles, public.cvs, public.jobs, public.entitlements from authenticated;
revoke insert, update, delete on public.entitlements from authenticated;
