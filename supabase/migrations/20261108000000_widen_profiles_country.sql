-- M1: allow any lowercase ISO 3166-1 alpha-2 country code on profiles.
-- The old three-value check was too narrow for the worldwide country registry. Forward only.
--
-- The application layer must validate a country with lib/countries isCountry before writing
-- this column; this check is a data-integrity backstop, not the market allowlist.

begin;

set local lock_timeout = '5s';

alter table public.profiles drop constraint if exists profiles_country_check;

alter table public.profiles
  add constraint profiles_country_check check (country ~ '^[a-z]{2}$') not valid;

alter table public.profiles validate constraint profiles_country_check;

commit;
