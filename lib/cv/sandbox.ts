import { storedCvSchema, type Cv } from "@/lib/cv/schema";
import { saveCv } from "@/lib/storage/cvStore";

/**
 * Anonymous CV sandbox. Visitors who have not signed up edit a single draft that lives in this
 * browser's localStorage only. Nothing is written to IndexedDB and nothing leaves the device.
 * On sign-up the draft moves onto the new account through migrateSandboxToAccount.
 *
 * See docs/MONETIZATION.md (Soft-start sandbox) and docs/RULES.md rule 16.
 */
export const SANDBOX_KEY = "stepkite-cv-sandbox";
export const USER_COOKIE = "sk_user";
export const USER_ID_STORAGE_KEY = "sk_user_id";

/**
 * True on this device when the visitor is not signed in. Checked by looking for an entitlement
 * cookie first, then a stored user id. The server has no way to know on a static page, so this
 * returns true on the server as a safe default (anonymous editors never leak data).
 */
export function isAnonymous(): boolean {
  if (typeof document === "undefined") return true;
  const hasCookie = document.cookie
    .split(";")
    .some((part) => part.trim().startsWith(`${USER_COOKIE}=`));
  if (hasCookie) return false;
  try {
    return localStorage.getItem(USER_ID_STORAGE_KEY) === null;
  } catch {
    return true;
  }
}

/**
 * Reads the anonymous draft from this browser. Returns null when nothing is saved, when the
 * saved value no longer matches the current CV shape, or when the browser blocks storage. The
 * value is validated with the stored CV schema so a tampered copy never reaches the editor.
 */
export function readSandboxDraft(): Cv | null {
  if (typeof localStorage === "undefined") return null;
  let raw: string | null;
  try {
    raw = localStorage.getItem(SANDBOX_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const result = storedCvSchema.safeParse(parsed);
  return result.success ? result.data : null;
}

/** Overwrites the anonymous draft. Returns true when the write landed. */
export function writeSandboxDraft(draft: Cv): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    localStorage.setItem(SANDBOX_KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

/** Removes the anonymous draft. Safe when nothing is saved. */
export function clearSandboxDraft(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(SANDBOX_KEY);
  } catch {
    // A private window or a blocked store holds nothing of ours anyway.
  }
}

/**
 * Copies the anonymous draft onto the signed-in account's device store and clears the sandbox.
 * Returns the id of the saved CV, or null when there was nothing to copy or the save failed.
 * The caller passes the new userId so a later server route can stamp ownership on the row.
 *
 * TODO: /api/sandbox/migrate will call this on the server after Supabase lands. The server
 * route will accept a validated draft in the request body, write it to the user's row, and
 * return 200 so this device can clear its own copy.
 */
export async function migrateSandboxToAccount(userId: string): Promise<string | null> {
  if (!userId) return null;
  const draft = readSandboxDraft();
  if (!draft) return null;
  const stamped: Cv = { ...draft, updatedAt: new Date().toISOString() };
  const saved = await saveCv(stamped);
  if (!saved.ok) return null;
  clearSandboxDraft();
  return stamped.id;
}
