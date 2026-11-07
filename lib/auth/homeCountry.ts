import type { SupabaseClient } from "@supabase/supabase-js";
import { isCountry, type CountryCode } from "@/lib/countries";
import { countryFromRequest } from "@/lib/geo";
import { HOME_COUNTRY_KEY, homeCountry } from "./session";

/**
 * Sets the account's home market once, right after sign-in, when it has none yet. The choice
 * from the sign-up page wins; without one, the visitor's location is used. An existing choice is
 * never overwritten here: changing it is done in account settings.
 *
 * Returns the country now on the account, or null. A failed write does not block sign-in: the
 * user lands signed in and can pick the country in account settings.
 */
export async function saveHomeCountryIfMissing(
  supabase: SupabaseClient,
  chosen: string | null,
  headers: Headers,
): Promise<CountryCode | null> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    const existing = homeCountry(data.user.user_metadata);
    if (existing) return existing;
    const country = chosen && isCountry(chosen) ? chosen : countryFromRequest(headers);
    if (!country) return null;
    const update = await supabase.auth.updateUser({ data: { [HOME_COUNTRY_KEY]: country } });
    return update.error ? null : country;
  } catch {
    return null;
  }
}

/** Sets the home market from account settings. Returns false when the write failed. */
export async function setHomeCountry(
  supabase: SupabaseClient,
  country: CountryCode,
): Promise<boolean> {
  try {
    const { error } = await supabase.auth.updateUser({ data: { [HOME_COUNTRY_KEY]: country } });
    return !error;
  } catch {
    return false;
  }
}
