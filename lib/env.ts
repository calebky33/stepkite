/**
 * Server-only environment reads. Values come from Cloudflare and Supabase settings.
 * Nothing secret ever sits in a NEXT_PUBLIC_* variable (CLAUDE.md rule 11).
 */
export type EnvResult = { ok: true; value: string } | { ok: false; name: string };

export function readEnv(name: string): EnvResult {
  const value = process.env[name];
  return value ? { ok: true, value } : { ok: false, name };
}

export const publicSupabase = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
};
