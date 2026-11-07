-- M1: allow any two-letter lowercase registry code on profiles (lib/countries, for example
-- 'uk', which is not the ISO 3166-1 code 'gb'). The old three-value check was too narrow for
-- the worldwide country registry. Forward only.
--
-- The application layer must validate a country with lib/countries isCountry before writing
-- this column; this check is a data-integrity backstop, not the market allowlist.
--
-- Rollback: null out codes outside ('uk', 'us', 'in') first, then restore the old check.
--
-- Two transactions: the swap takes a brief ACCESS EXCLUSIVE lock and skips the scan
-- (NOT VALID); validation runs separately under SHARE UPDATE EXCLUSIVE so writes keep flowing.

begin;

set local lock_timeout = '5s';

alter table public.profiles drop constraint if exists profiles_country_check;

alter table public.profiles
  add constraint profiles_country_check check (country ~ '^[a-z]{2}$') not valid;

commit;

begin;

set local lock_timeout = '5s';

alter table public.profiles validate constraint profiles_country_check;

commit;
