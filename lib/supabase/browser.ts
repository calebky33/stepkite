"use client";

import { createBrowserClient } from "@supabase/ssr";
import { publicSupabase } from "@/lib/env";

/** Browser client for sign-in and opted-in sync only. Null when Supabase is not configured. */
export function createSupabaseBrowser() {
  if (!publicSupabase.url || !publicSupabase.anonKey) return null;
  return createBrowserClient(publicSupabase.url, publicSupabase.anonKey);
}
