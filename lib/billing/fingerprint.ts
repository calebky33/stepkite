/**
 * Client only browser fingerprint. The trial route stores a SHA-256 of this value as a brake
 * on claiming the same no card trial from the same browser twice. See docs/MONETIZATION.md
 * (trial_fingerprints) and docs/RULES.md on data minimisation.
 *
 * The inputs are deliberately coarse (user agent, language, timezone, screen size). No cookies,
 * no stored ids, nothing that would survive a cache clear or that could identify the person
 * off site. Same browser gets the same hash, which is all the trial brake needs.
 *
 * Runs in the browser only: it uses `navigator`, `screen`, `Intl` and `crypto.subtle.digest`.
 * Importing this on the server will not throw at module time, but calling it will.
 */

function readTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  } catch {
    return "";
  }
}

function readScreen(): string {
  if (typeof screen === "undefined") return "0x0";
  const w = Number(screen.width) || 0;
  const h = Number(screen.height) || 0;
  return `${w}x${h}`;
}

function readLanguage(): string {
  if (typeof navigator === "undefined") return "";
  return navigator.language ?? "";
}

function readUserAgent(): string {
  if (typeof navigator === "undefined") return "";
  return navigator.userAgent ?? "";
}

function toHex(buf: ArrayBuffer): string {
  const view = new Uint8Array(buf);
  let out = "";
  for (let i = 0; i < view.length; i += 1) {
    out += view[i].toString(16).padStart(2, "0");
  }
  return out;
}

/**
 * Returns a 64 character hex SHA-256 of the coarse browser fingerprint. Deterministic for a
 * given browser. Caller passes this to POST /api/trial/start. The server stores only the hash,
 * never the inputs.
 */
export async function computeFingerprint(): Promise<string> {
  const parts = [readUserAgent(), readLanguage(), readTimezone(), readScreen()];
  const bytes = new TextEncoder().encode(parts.join("|"));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return toHex(digest);
}
