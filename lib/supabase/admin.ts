import { createClient } from "@supabase/supabase-js";
import { publicSupabase, readEnv } from "@/lib/env";

/**
 * Service role client. Server routes only (webhook, delete my data). It skips row level security,
 * so every caller must check ownership first. Never import this from a client component.
 */
export function createSupabaseAdmin() {
  const key = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!key.ok || !publicSupabase.url) return null;
  return createClient(publicSupabase.url, key.value, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
