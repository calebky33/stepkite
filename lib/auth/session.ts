import { createSupabaseServer } from "@/lib/supabase/server";

export type SessionUser = {
  id: string;
  email: string;
  createdAt: string;
};

export async function getSession(_request?: Request): Promise<SessionUser | null> {
  // The argument is unused: the cookie bridge reads from next/headers. It stays optional so
  // route handlers can still write `getSession(request)` as a self-documenting pattern.
  void _request;
  const supabase = await createSupabaseServer();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return {
    id: data.user.id,
    email: data.user.email ?? "",
    createdAt: data.user.created_at,
  };
}

/** Requires a signed-in user. Returns a 401 Response otherwise, which routes should return. */
export async function requireSession(request?: Request): Promise<SessionUser | Response> {
  const user = await getSession(request);
  if (!user) {
    return Response.json({ error: "sign_in_required" }, { status: 401 });
  }
  return user;
}
