/**
 * Paystack client for Cloudflare Workers. Fetch based, no SDK. Keys live in env:
 *   PAYSTACK_SECRET_KEY        — sk_live_... or sk_test_... (Worker secret; used for API calls
 *                                and for legacy x-paystack-signature verification)
 *   PAYSTACK_WEBHOOK_SECRET    — whsec_... (Worker secret; used for the current Paystack-Signature
 *                                v1 header. Paystack dashboard, API keys and webhooks section)
 *
 * Reference: docs/MONETIZATION.md and https://paystack.com/docs.
 *
 * Interval vocabulary: Paystack plans use the strings "hourly", "daily", "weekly", "monthly",
 * "quarterly", "biannually", "annually". The Stepkite `plans.interval` column uses the shorter
 * "month" and "year" forms. Map Paystack → Stepkite when writing from a webhook, never copy the
 * Paystack string straight into the column.
 */
import { z } from "zod";
import { readEnv } from "@/lib/env";

const API = "https://api.paystack.co";
const DEFAULT_TIMEOUT_MS = 8_000;

export interface PaystackClient {
  initializeTransaction: (input: InitializeInput) => Promise<InitializeResult>;
  verifyTransaction: (reference: string) => Promise<VerifyResult>;
  disableSubscription: (code: string, emailToken: string) => Promise<DisableResult>;
}

export interface InitializeInput {
  email: string;
  /** Amount in cents (USD minor unit). Must be a non-negative integer. */
  amount: number;
  reference: string;
  callbackUrl: string;
  /** Paystack plan code for subscriptions (PLN_...). Omit for one-time charges. */
  plan?: string;
  /** Hard cap on renewals. Only valid when `plan` is set. */
  invoiceLimit?: number;
  metadata?: Record<string, unknown>;
}

export interface InitializeResult {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

export interface VerifyResult {
  status: "success" | "failed" | "abandoned" | "pending";
  amount: number;
  currency: string;
  reference: string;
  customerEmail: string;
  customerCode: string;
  planCode: string | null;
  metadata: unknown;
}

export interface DisableResult {
  ok: boolean;
}

/** Thrown by the client when a request fails. `status` is the HTTP status, or 0 on a transport
 *  failure (timeout, DNS, TLS). Routes should map 4xx to 400 and transport/5xx to 502. */
export class PaystackError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "PaystackError";
  }
}

const verifySchema = z.object({
  status: z.enum(["success", "failed", "abandoned", "pending"]),
  amount: z.number().int().nonnegative(),
  currency: z.string().min(1),
  reference: z.string().min(1),
  customer: z.object({
    email: z.email(),
    customer_code: z.string().min(1),
  }),
  // Paystack returns `plan` as a string code (e.g. "PLN_...") on the inline shape and sometimes
  // as an object or 0 when no plan is attached. Accept any shape and read the code defensively.
  plan: z.unknown().optional(),
  metadata: z.unknown().optional(),
});

const initializeSchema = z.object({
  authorization_url: z.url(),
  access_code: z.string().min(1),
  reference: z.string().min(1),
});

export function createPaystack(options?: {
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}): PaystackClient | null {
  const key = readEnv("PAYSTACK_SECRET_KEY");
  if (!key.ok) return null;
  const secret = key.value;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fetchImpl = options?.fetchImpl ?? fetch;

  async function call<T>(path: string, init: RequestInit, schema: z.ZodType<T>): Promise<T> {
    let res: Response;
    try {
      res = await fetchImpl(`${API}${path}`, {
        ...init,
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
          ...(init.headers ?? {}),
        },
      });
    } catch {
      throw new PaystackError(`paystack ${path} transport failure`, 0);
    }
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      throw new PaystackError(`paystack ${path} invalid json (${res.status})`, res.status);
    }
    if (!res.ok) {
      throw new PaystackError(`paystack ${path} rejected (${res.status})`, res.status);
    }
    const parsed = z
      .object({ status: z.boolean(), data: z.unknown().optional(), message: z.string().optional() })
      .safeParse(body);
    if (!parsed.success || !parsed.data.status) {
      throw new PaystackError(`paystack ${path} rejected`, res.status);
    }
    const data = schema.safeParse(parsed.data.data);
    if (!data.success) {
      throw new PaystackError(`paystack ${path} unexpected shape`, res.status);
    }
    return data.data;
  }

  return {
    async initializeTransaction(input) {
      if (!Number.isInteger(input.amount) || input.amount < 0) {
        throw new PaystackError("paystack initialize: amount must be a non-negative integer", 400);
      }
      const data = await call(
        "/transaction/initialize",
        {
          method: "POST",
          body: JSON.stringify({
            email: input.email,
            amount: input.amount,
            currency: "USD",
            reference: input.reference,
            callback_url: input.callbackUrl,
            plan: input.plan,
            invoice_limit: input.plan ? input.invoiceLimit : undefined,
            metadata: input.metadata,
          }),
        },
        initializeSchema,
      );
      return {
        authorizationUrl: data.authorization_url,
        accessCode: data.access_code,
        reference: data.reference,
      };
    },
    async verifyTransaction(reference) {
      const data = await call(
        `/transaction/verify/${encodeURIComponent(reference)}`,
        { method: "GET" },
        verifySchema,
      );
      const planCode =
        typeof data.plan === "string" && data.plan.startsWith("PLN_") ? data.plan : null;
      return {
        status: data.status,
        amount: data.amount,
        currency: data.currency,
        reference: data.reference,
        customerEmail: data.customer.email,
        customerCode: data.customer.customer_code,
        planCode,
        metadata: data.metadata ?? null,
      };
    },
    async disableSubscription(code, emailToken) {
      // Paystack's disable endpoint returns {status: true, message: "Subscription disabled..."}
      // with no `data` on success, so parse the wrapper only (no inner schema).
      let res: Response;
      try {
        res = await fetchImpl(`${API}/subscription/disable`, {
          method: "POST",
          signal: AbortSignal.timeout(timeoutMs),
          headers: {
            Authorization: `Bearer ${secret}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code, token: emailToken }),
        });
      } catch {
        throw new PaystackError("paystack /subscription/disable transport failure", 0);
      }
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        throw new PaystackError(
          `paystack /subscription/disable invalid json (${res.status})`,
          res.status,
        );
      }
      if (!res.ok) {
        throw new PaystackError(
          `paystack /subscription/disable rejected (${res.status})`,
          res.status,
        );
      }
      const parsed = z.object({ status: z.boolean() }).safeParse(body);
      if (!parsed.success || !parsed.data.status) {
        throw new PaystackError("paystack /subscription/disable rejected", res.status);
      }
      return { ok: true };
    },
  };
}

/**
 * Verify a Paystack webhook signature. Returns true on a match, false otherwise. Reads the raw
 * body as a string: never parse before verifying.
 *
 * Paystack signs events two ways. The current scheme sets a `Paystack-Signature` header shaped
 * like `t=<unix seconds>,v1=<kid>:<hex>` where the HMAC-SHA512 covers `<t>.<kid>.<body>` with the
 * `whsec_...` signing secret. The legacy scheme sets `x-paystack-signature` to a bare SHA-512
 * HMAC of the body with the integration's secret key. We accept either so a slow migration
 * cannot drop live events on the floor.
 *
 * Replay protection: the current scheme caps `t` to a 300 second window. The legacy header has
 * no timestamp, so the webhook route must also idempotently key on a stable event identifier.
 */
export async function verifyPaystackSignature(options: {
  rawBody: string;
  signatureHeader: string | null;
  legacyHeader: string | null;
  signingSecret: string | null;
  secretKey: string | null;
  now?: number;
  toleranceSeconds?: number;
}): Promise<boolean> {
  const { rawBody, signatureHeader, legacyHeader, signingSecret, secretKey } = options;
  const now = options.now ?? Math.floor(Date.now() / 1000);
  const tolerance = options.toleranceSeconds ?? 300;

  if (signatureHeader && signingSecret) {
    const parts = signatureHeader.split(",").map((s) => s.trim());
    let t: number | null = null;
    const entries: Array<{ kid: string; sig: string }> = [];
    for (const part of parts) {
      const eq = part.indexOf("=");
      if (eq === -1) continue;
      const key = part.slice(0, eq).trim();
      const value = part.slice(eq + 1).trim();
      if (key === "t" && /^[0-9]+$/.test(value)) {
        t = Number(value);
      } else if (key === "v1") {
        const colon = value.indexOf(":");
        if (colon !== -1) {
          entries.push({ kid: value.slice(0, colon), sig: value.slice(colon + 1).toLowerCase() });
        }
      }
    }
    if (t !== null && entries.length > 0 && Math.abs(now - t) <= tolerance) {
      for (const entry of entries) {
        const payload = `${t}.${entry.kid}.${rawBody}`;
        const expected = await hmacSha512Hex(signingSecret, payload);
        if (constantTimeEquals(expected, entry.sig)) return true;
      }
    }
  }

  if (legacyHeader && secretKey) {
    const expected = await hmacSha512Hex(secretKey, rawBody);
    if (constantTimeEquals(expected, legacyHeader.trim().toLowerCase())) return true;
  }

  return false;
}

async function hmacSha512Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
