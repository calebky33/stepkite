import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicSupabase } from "@/lib/env";

/** Server client that acts as the signed-in user, so row level security applies. Null when Supabase is not configured. */
export async function createSupabaseServer() {
  if (!publicSupabase.url || !publicSupabase.anonKey) return null;
  const cookieStore = await cookies();
  return createServerClient(publicSupabase.url, publicSupabase.anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (items) => {
        // Server Components cannot set cookies. Route handlers and actions can.
        try {
          items.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Expected when called from a Server Component. The session refreshes on the next route handler call.
        }
      },
    },
  });
}
