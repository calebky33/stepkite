import { z } from "zod";
import { setHomeCountry } from "@/lib/auth/homeCountry";
import { requireSession } from "@/lib/auth/session";
import { isCountry } from "@/lib/countries";
import { readBodyCapped } from "@/lib/http/body";
import { rateLimit } from "@/lib/rateLimit";
import { createSupabaseServer } from "@/lib/supabase/server";

const bodySchema = z.object({ country: z.string().refine((c) => isCountry(c)) }).strict();

const reply = (body: unknown, status: number) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** Changes the signed-in user's home market. Same-origin, rate limited, registry codes only. */
export async function POST(request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return reply({ error: "forbidden" }, 403);
  if (!(await rateLimit(request, "RL_AUTH"))) return reply({ error: "rate_limited" }, 429);

  const user = await requireSession(request);
  if (user instanceof Response) return user;

  const body = await readBodyCapped(request, 1024);
  if (body.kind === "too-large") return reply({ error: "too_large" }, 413);
  if (body.kind === "read-failed") return reply({ error: "invalid" }, 400);
  let json: unknown = null;
  try {
    json = JSON.parse(body.text);
  } catch {
    json = null;
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success || !isCountry(parsed.data.country)) return reply({ error: "invalid" }, 400);

  const supabase = await createSupabaseServer();
  if (!supabase) return reply({ error: "not_available" }, 503);
  const saved = await setHomeCountry(supabase, parsed.data.country);
  if (!saved) return reply({ error: "save_failed" }, 500);
  return reply({ country: parsed.data.country }, 200);
}
