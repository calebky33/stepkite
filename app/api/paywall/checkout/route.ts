import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { readBodyCapped } from "@/lib/http/body";
import { PaystackError, createPaystack } from "@/lib/paystack";
import { rateLimit } from "@/lib/rateLimit";
import { SITE_URL } from "@/lib/seo";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Starts a Paystack checkout for the signed in user and returns the hosted authorization URL.
 *
 * The amount and plan code come from the Supabase `plans` row, never from the client. The client
 * only names a plan. The webhook is the only thing that grants access, so nothing here writes to
 * `entitlements`. The callback URL is built from SITE_URL, never from a request header.
 * See docs/MONETIZATION.md (POST /api/paywall/checkout).
 */

const bodySchema = z.object({ plan: z.enum(["monthly", "yearly", "lifetime"]) }).strict();
const MAX_REQUEST_BYTES = 4096;

const planRowSchema = z
  .object({
    code: z.string(),
    paystack_plan_code: z.string().min(1).nullable(),
    amount_cents: z.number().int(),
  })
  .nullable();
const entitlementRowSchema = z
  .object({
    plan_code: z.string(),
    status: z.string(),
    current_period_end: z.string().nullable(),
  })
  .nullable();

function hasLivePlan(row: {
  plan_code: string;
  status: string;
  current_period_end: string | null;
}) {
  if (row.plan_code === "lifetime") return true;
  if (row.status === "active" || row.status === "past_due") return true;
  if (row.status === "canceled" && row.current_period_end) {
    return new Date(row.current_period_end).getTime() > Date.now();
  }
  return false;
}

/** One structured line per failure. Ids and codes only: never the email, body or any secret. */
function logFailure(event: string, fields: Record<string, string>): void {
  console.error(JSON.stringify({ route: "paywall/checkout", event, ...fields }));
}

function reply(body: Record<string, string>, status: number): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return reply({ error: "forbidden" }, 403);
  if (!(await rateLimit(request, "RL_AUTH"))) return reply({ error: "rate_limited" }, 429);
  if (Number(request.headers.get("content-length") ?? 0) > MAX_REQUEST_BYTES)
    return reply({ error: "too_large" }, 413);

  const body = await readBodyCapped(request, MAX_REQUEST_BYTES);
  if (body.kind === "too-large") return reply({ error: "too_large" }, 413);
  if (body.kind === "read-failed") return reply({ error: "invalid_request" }, 400);

  let json: unknown = null;
  try {
    json = JSON.parse(body.text);
  } catch {
    return reply({ error: "invalid_request" }, 400);
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return reply({ error: "invalid_request" }, 400);
  const planCode = parsed.data.plan;

  const session = await requireSession(request);
  if (session instanceof Response) return session;
  if (!session.email) return reply({ error: "email_required" }, 400);

  const admin = createSupabaseAdmin();
  const paystack = createPaystack();
  if (!admin || !paystack) {
    logFailure("not_configured", {
      admin: String(Boolean(admin)),
      paystack: String(Boolean(paystack)),
    });
    return reply({ error: "not_available_yet" }, 503);
  }

  const [planRes, entitlementRes] = await Promise.all([
    admin
      .from("plans")
      .select("code, paystack_plan_code, amount_cents")
      .eq("code", planCode)
      .eq("active", true)
      .maybeSingle(),
    admin
      .from("entitlements")
      .select("plan_code, status, current_period_end")
      .eq("user_id", session.id)
      .maybeSingle(),
  ]);
  if (planRes.error || entitlementRes.error) {
    logFailure("lookup_failed", { plan: planCode, userId: session.id });
    return reply({ error: "lookup_failed" }, 502);
  }

  // The Supabase client is untyped, so check the row shapes before using them.
  const planRow = planRowSchema.safeParse(planRes.data);
  const entitlementRow = entitlementRowSchema.safeParse(entitlementRes.data);
  if (!planRow.success || !entitlementRow.success) {
    logFailure("row_shape_invalid", { plan: planCode, userId: session.id });
    return reply({ error: "lookup_failed" }, 502);
  }

  const plan = planRow.data;
  if (!plan || plan.amount_cents <= 0) return reply({ error: "plan_unavailable" }, 404);
  // Subscriptions need a Paystack plan code. Lifetime is a one-time charge and has none.
  if (planCode !== "lifetime" && !plan.paystack_plan_code)
    return reply({ error: "plan_unavailable" }, 404);

  // Block anyone who has, or may still have, a live Paystack subscription or lifetime. A trial
  // takes no card, so a trialing user can buy. A cancelled plan is paid up until its period ends.
  const current = entitlementRow.data;
  if (current && hasLivePlan(current)) return reply({ error: "already_subscribed" }, 409);

  try {
    const result = await paystack.initializeTransaction({
      email: session.email,
      amount: plan.amount_cents,
      reference: `sk_${crypto.randomUUID()}`,
      callbackUrl: `${SITE_URL}/account`,
      ...(planCode === "lifetime" ? {} : { plan: plan.paystack_plan_code ?? undefined }),
      metadata: { user_id: session.id, plan: planCode },
    });
    return reply({ authorization_url: result.authorizationUrl }, 200);
  } catch (error) {
    logFailure("initialize_failed", {
      plan: planCode,
      userId: session.id,
      paystackStatus: error instanceof PaystackError ? String(error.status) : "not_paystack_error",
    });
    const unavailable =
      !(error instanceof PaystackError) || error.status === 0 || error.status >= 500;
    return reply({ error: unavailable ? "provider_unavailable" : "checkout_failed" }, 502);
  }
}
