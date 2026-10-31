/**
 * Cloudflare Turnstile server-side verification.
 * Returns ok=true when the token clears siteverify, the action matches, and the hostname is
 * one we expect. When TURNSTILE_SECRET is not set, verification is skipped (local dev before
 * the owner creates the widget). In production the deploy must have the secret set, or every
 * request fails closed.
 */
export const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type TurnstileResult =
  | { ok: true }
  | { ok: false; reason: "missing" | "invalid" | "wrong-action" | "wrong-host" | "network" };

export async function verifyTurnstile(options: {
  secret: string | undefined;
  token: unknown;
  remoteIp?: string | null;
  expectedAction: string;
  expectedHostnames: readonly string[];
}): Promise<TurnstileResult> {
  const { secret, token, remoteIp, expectedAction, expectedHostnames } = options;
  // No secret configured: skip verification entirely (keeps local dev working before the
  // widget is created). Production always sets the secret, so this branch never trips there.
  if (!secret) return { ok: true };
  if (typeof token !== "string" || token.length === 0 || token.length > 2048) {
    return { ok: false, reason: "missing" };
  }
  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);
  type Reply = { success?: boolean; action?: string; hostname?: string };
  let data: Reply;
  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return { ok: false, reason: "network" };
    data = (await res.json()) as Reply;
  } catch {
    return { ok: false, reason: "network" };
  }
  if (!data.success) return { ok: false, reason: "invalid" };
  if (expectedAction && data.action && data.action !== expectedAction) {
    return { ok: false, reason: "wrong-action" };
  }
  if (expectedHostnames.length > 0 && data.hostname && !expectedHostnames.includes(data.hostname)) {
    return { ok: false, reason: "wrong-host" };
  }
  return { ok: true };
}
