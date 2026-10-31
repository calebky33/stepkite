import { getCloudflareContext } from "@opennextjs/cloudflare";

/** The Workers Rate Limiting binding. */
export type RateLimitBinding = { limit(options: { key: string }): Promise<{ success: boolean }> };

/** Binding names, matching `ratelimits` in wrangler.jsonc. */
export type RateLimitName = "RL_JOB_PREVIEW" | "RL_NEWSLETTER";

export type RateLimitOptions = { failClosed?: boolean };

/**
 * True when the call may go ahead. Allows when the binding is missing (local dev, tests) and
 * fails open when the binding throws, unless `failClosed` is set. With `failClosed`, a thrown
 * error, or a missing binding in production, refuses. Never throws and never logs the key.
 */
export async function allowRequest(
  binding: RateLimitBinding | undefined,
  key: string,
  options: RateLimitOptions = {},
): Promise<boolean> {
  if (!binding) return !(options.failClosed && process.env.NODE_ENV === "production");
  try {
    return (await binding.limit({ key })).success;
  } catch {
    return !options.failClosed;
  }
}

function findBinding(name: RateLimitName): RateLimitBinding | undefined {
  try {
    const env = getCloudflareContext().env as unknown as Record<
      string,
      RateLimitBinding | undefined
    >;
    return env[name];
  } catch {
    return undefined;
  }
}

const IPV4 = /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;
const HEX_GROUP = /^[0-9a-fA-F]{1,4}$/;

function groupsOf(part: string): string[] | null {
  if (part === "") return [];
  const items = part.split(":");
  return items.every((g) => HEX_GROUP.test(g)) ? items : null;
}

/** Strict IPv4 or IPv6 check. No ports, zones, brackets or whitespace. */
export function isIpAddress(value: string): boolean {
  if (value.length > 45) return false;
  if (IPV4.test(value)) return true;
  if (!/^[0-9a-fA-F:.]+$/.test(value) || !value.includes(":")) return false;
  let head = value;
  const tail = value.slice(value.lastIndexOf(":") + 1);
  if (tail.includes(".")) {
    if (!IPV4.test(tail)) return false;
    head = `${value.slice(0, value.lastIndexOf(":") + 1)}0:0`;
  }
  const halves = head.split("::");
  if (halves.length > 2) return false;
  if (halves.length === 1) return groupsOf(head)?.length === 8;
  const left = groupsOf(halves[0]);
  const right = groupsOf(halves[1]);
  if (!left || !right) return false;
  return left.length + right.length < 8;
}

/**
 * Rate limit a request by caller address. Returns true when allowed. A missing or malformed
 * cf-connecting-ip skips the Cloudflare limiter (the caller's in-process guard still applies)
 * rather than sharing one bucket between all unknown callers.
 */
export async function rateLimit(
  request: Request,
  name: RateLimitName,
  options: RateLimitOptions = {},
): Promise<boolean> {
  const ip = request.headers.get("cf-connecting-ip")?.trim() ?? "";
  if (!isIpAddress(ip)) return true;
  return allowRequest(findBinding(name), ip, options);
}
