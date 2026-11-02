const SAFE_PATH = /^\/(?!\/)[A-Za-z0-9/_\-.?=&%:]*$/;
const BLOCKED_PREFIXES = ["/api/", "/sign-", "/account", "/billing"];

/** Returns a safe same-origin redirect path, falling back to "/" when the input is unsafe.
 * Blocks protocol-relative URLs, open-redirect vectors, auth routes, and the sign-in loop. */
export function safeNext(input: string | null | undefined): string {
  if (!input) return "/";
  if (!SAFE_PATH.test(input)) return "/";
  if (BLOCKED_PREFIXES.some((prefix) => input.startsWith(prefix))) return "/";
  return input;
}
