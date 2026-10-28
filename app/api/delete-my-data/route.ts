import { z } from "zod";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServer } from "@/lib/supabase/server";

const bodySchema = z.object({ confirm: z.literal(true) });

/** Deletes the signed-in user's account. Their CVs, jobs and profile go with it (on delete cascade). */
export async function POST(request: Request): Promise<Response> {
  if (!bodySchema.safeParse(await request.json().catch(() => null)).success) {
    return Response.json({ error: "confirmation_required" }, { status: 400 });
  }
  const supabase = await createSupabaseServer();
  const admin = createSupabaseAdmin();
  if (!supabase || !admin) return Response.json({ error: "not_available" }, { status: 503 });

  const { data } = await supabase.auth.getUser();
  if (!data.user) return Response.json({ error: "sign_in_required" }, { status: 401 });

  // The id comes from the verified session, never from the request body.
  const { error } = await admin.auth.admin.deleteUser(data.user.id);
  if (error) return Response.json({ error: "delete_failed" }, { status: 500 });
  await supabase.auth.signOut();
  return Response.json({ deleted: true });
}
