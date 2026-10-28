import type { SupabaseClient } from "@supabase/supabase-js";

export type EntitlementKind = "pro_pass" | "annual" | "student";

export interface Entitlement {
  kind: EntitlementKind;
  expires_at: string;
}

/** Pure check. The caller passes the server's clock. The browser clock is never used for access (RULES.md 31). */
export function isEntitled(rows: readonly Entitlement[], nowMs: number): boolean {
  return rows.some((row) => Date.parse(row.expires_at) > nowMs);
}

export type ProStatus =
  { status: "pro"; until: string } | { status: "free" } | { status: "unknown" };

/** Reads the signed-in user's entitlements. Row level security limits rows to the owner. */
export async function getProStatus(supabase: SupabaseClient, nowMs: number): Promise<ProStatus> {
  const { data, error } = await supabase
    .from("entitlements")
    .select("kind, expires_at")
    .order("expires_at", { ascending: false });
  if (error || !data) return { status: "unknown" };
  const rows = data as Entitlement[];
  const active = rows.find((row) => Date.parse(row.expires_at) > nowMs);
  return active ? { status: "pro", until: active.expires_at } : { status: "free" };
}
