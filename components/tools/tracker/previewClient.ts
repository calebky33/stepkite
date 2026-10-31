export type ReadReason =
  | "invalid"
  | "blocked"
  | "not-html"
  | "too-large"
  | "timeout"
  | "no-details"
  | "fetch-failed"
  | "not-found"
  | "blocked-by-site"
  | "read-failed"
  | "rate-limited"
  | "forbidden";

export type ReadResult =
  | { ok: true; title?: string; company?: string; titleSource?: "jsonld" | "og" | "title" }
  | { ok: false; reason: ReadReason };

export const READ_LINK_NOTICE =
  "The link is sent to our server to read the page once. Nothing is stored.";

export const READ_MESSAGES: Record<ReadReason, string> = {
  invalid: "That link does not look right. Paste the full link, starting with http or https.",
  blocked: "We cannot read that address. Type the title and company yourself.",
  "not-html": "That link does not open a web page. Type the title and company yourself.",
  "too-large": "That page is too big to read. Type the title and company yourself.",
  timeout: "The page took too long to answer. Try again, or type the title and company yourself.",
  "no-details": "The page loaded, but we could not find a title or company. Type them in yourself.",
  "fetch-failed": "We could not open that page. Check the link, or type the details yourself.",
  "not-found": "The page was not found. The ad may be gone. Type the title and company yourself.",
  "blocked-by-site": "That site does not allow previews. Enter the title and company by hand.",
  "read-failed": "The connection dropped while reading the page. Try again.",
  "rate-limited": "Too many links were read just now. Wait a minute, then try again.",
  forbidden: "This request was refused. Reload the page and try again.",
};

const REASONS: readonly string[] = Object.keys(READ_MESSAGES);
const isReason = (v: unknown): v is ReadReason => typeof v === "string" && REASONS.includes(v);

/** Short plain text only. Nothing from the page is ever treated as markup. */
const clean = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() !== "" ? v.trim().slice(0, 160) : undefined;

/** Asks our server to read one page. Never throws. An aborted request returns fetch-failed. */
export async function readLink(
  url: string,
  doFetch: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<ReadResult> {
  let response: Response;
  try {
    response = await doFetch("/api/job-preview", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url }),
      signal,
    });
  } catch {
    return { ok: false, reason: "fetch-failed" };
  }
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  const record: Record<string, unknown> =
    typeof body === "object" && body !== null ? Object.fromEntries(Object.entries(body)) : {};
  if (record.ok === true) {
    const title = clean(record.title);
    const company = clean(record.company);
    const source = record.titleSource;
    const titleSource =
      source === "jsonld" || source === "og" || source === "title" ? source : undefined;
    return title || company
      ? { ok: true, title, company, titleSource }
      : { ok: false, reason: "no-details" };
  }
  if (isReason(record.reason)) return { ok: false, reason: record.reason };
  if (response.status === 429) return { ok: false, reason: "rate-limited" };
  if (response.status === 403) return { ok: false, reason: "forbidden" };
  return { ok: false, reason: "fetch-failed" };
}

export const TITLE_CHECK_HINT =
  "The title came from the page heading and may include extra words. Check it before you add the job.";
