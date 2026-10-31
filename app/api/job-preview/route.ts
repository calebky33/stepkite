import { z } from "zod";
import { rateLimit } from "@/lib/rateLimit";
import {
  MAX_URL_LENGTH,
  createRateGuard,
  fetchPreview,
  type PreviewReason,
} from "@/lib/tracker/preview";

const bodySchema = z.object({ url: z.string().max(MAX_URL_LENGTH) }).strict();
const MAX_REQUEST_BYTES = 4096;
const allow = createRateGuard(60, 60_000);

type RouteReason = PreviewReason | "rate-limited" | "forbidden";

const STATUS: Record<RouteReason, number> = {
  invalid: 400,
  forbidden: 403,
  "rate-limited": 429,
  blocked: 422,
  "not-html": 422,
  "no-details": 422,
  "too-large": 422,
  timeout: 504,
  "fetch-failed": 502,
  "not-found": 422,
  "blocked-by-site": 422,
  "read-failed": 502,
};

function fail(reason: RouteReason, status: number = STATUS[reason]): Response {
  const headers: Record<string, string> = { "cache-control": "no-store" };
  if (reason === "rate-limited") headers["retry-after"] = "60";
  return Response.json({ ok: false, reason }, { status, headers });
}

type BodyRead = { kind: "ok"; text: string } | { kind: "too-large" } | { kind: "read-failed" };

/** Reads the body as a stream and stops at the byte cap. */
async function readBodyCapped(request: Request): Promise<BodyRead> {
  if (!request.body) return { kind: "ok", text: "" };
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_REQUEST_BYTES) {
        await reader.cancel().catch(() => undefined);
        return { kind: "too-large" };
      }
      chunks.push(value);
    }
  } catch {
    return { kind: "read-failed" };
  }
  const buf = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    buf.set(c, off);
    off += c.length;
  }
  return { kind: "ok", text: new TextDecoder().decode(buf) };
}

async function handle(request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return fail("forbidden");
  if (!(await rateLimit(request, "RL_JOB_PREVIEW", { failClosed: true })))
    return fail("rate-limited");
  if (!allow()) return fail("rate-limited");
  if (Number(request.headers.get("content-length") ?? 0) > MAX_REQUEST_BYTES)
    return fail("invalid", 413);
  const body = await readBodyCapped(request);
  if (body.kind === "too-large") return fail("invalid", 413);
  if (body.kind === "read-failed") return fail("read-failed", 400);
  let json: unknown;
  try {
    json = JSON.parse(body.text);
  } catch {
    return fail("invalid");
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return fail("invalid");
  const result = await fetchPreview(parsed.data.url, { selfHost: new URL(request.url).hostname });
  if (result.ok) {
    return Response.json(result, { status: 200, headers: { "cache-control": "no-store" } });
  }
  return fail(result.reason);
}

export async function POST(request: Request): Promise<Response> {
  try {
    return await handle(request);
  } catch {
    // Never log: the error could carry the link.
    return fail("fetch-failed", 502);
  }
}
