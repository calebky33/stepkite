-- M1: allow any lowercase ISO 3166-1 alpha-2 country code on profiles.
-- The old three-value check was too narrow for the worldwide country registry. Forward only.

begin;

alter table public.profiles drop constraint profiles_country_check;

-- Keep the column clean without pinning the market list: lowercase two-letter code only.
alter table public.profiles
  add constraint profiles_country_check check (country ~ '^[a-z]{2}$');

commit;
