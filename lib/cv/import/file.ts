/**
 * Checks a chosen file before any parser sees it. Type is decided by extension AND the first
 * bytes of the file, never by the browser's MIME string alone. Pure, no network.
 */

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_PDF_PAGES = 20;

export type FileKind = "pdf" | "docx" | "txt";

export type ImportErrorCode =
  | "wrong-type"
  | "old-word"
  | "empty"
  | "too-big"
  | "too-long"
  | "cancelled"
  | "password"
  | "corrupted"
  | "scanned"
  | "no-text"
  | "timeout"
  | "unavailable";

export const IMPORT_ERRORS: Record<ImportErrorCode, string> = {
  "wrong-type":
    "That file type does not work here. Choose a PDF, a Word file (.docx) or a text file (.txt).",
  "old-word":
    "Old Word files (.doc) cannot be read. Open it in Word, save it as .docx, and choose that file.",
  empty: "That file is empty. Choose a different one.",
  "too-big": "That file is too big to read here. Choose a smaller one, or save a shorter version.",
  "too-long": `That PDF has more than ${MAX_PDF_PAGES} pages. Choose a shorter copy, or one with only the pages you need.`,
  cancelled: "Reading was cancelled.",
  password:
    "That PDF is password protected. Remove the password, save a copy, and choose that copy.",
  corrupted:
    "We could not open that file. It may be damaged. Try saving it again from the app you made it in.",
  scanned:
    "That PDF looks like a scan, so it has no text to read. Use a PDF saved from Word or Google Docs, or type your details in.",
  "no-text":
    "We found no readable text in that file. Choose a different one, or type your details in.",
  timeout: "Reading that file took too long, so we stopped. Try a shorter copy.",
  unavailable:
    "The file reader did not load. Check your connection, reload the page and try again.",
};

export class ImportError extends Error {
  readonly code: ImportErrorCode;
  constructor(code: ImportErrorCode) {
    super(code);
    this.name = "ImportError";
    this.code = code;
  }
}

const startsWith = (bytes: Uint8Array, sig: readonly number[], at = 0): boolean =>
  sig.every((b, i) => bytes[at + i] === b);

function hasPdfHeader(head: Uint8Array): boolean {
  // The PDF header may follow a few bytes of junk, but must be in the first 1024 bytes.
  const limit = Math.min(head.length, 1024) - 5;
  for (let i = 0; i <= limit; i++)
    if (startsWith(head, [0x25, 0x50, 0x44, 0x46, 0x2d], i)) return true;
  return false;
}

const OLD_OFFICE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
const ZIP = [0x50, 0x4b, 0x03, 0x04];

/** True when the bytes look like text: a UTF-16 mark, or no NUL bytes in the first 4 KB. */
function looksLikeText(head: Uint8Array): boolean {
  if (startsWith(head, [0xff, 0xfe]) || startsWith(head, [0xfe, 0xff])) return true;
  const end = Math.min(head.length, 4096);
  for (let i = 0; i < end; i++) if (head[i] === 0) return false;
  return true;
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot + 1).toLowerCase();
}

/** Returns the file kind, or throws an ImportError with a code the screen turns into words. */
export function checkFile(name: string, size: number, head: Uint8Array): FileKind {
  if (size === 0) throw new ImportError("empty");
  if (size > MAX_FILE_BYTES) throw new ImportError("too-big");
  const ext = extensionOf(name);
  if (ext === "doc" || startsWith(head, OLD_OFFICE)) throw new ImportError("old-word");
  if (ext === "pdf") {
    if (!hasPdfHeader(head)) throw new ImportError("wrong-type");
    return "pdf";
  }
  if (ext === "docx") {
    if (!startsWith(head, ZIP)) throw new ImportError("wrong-type");
    return "docx";
  }
  if (ext === "txt") {
    if (hasPdfHeader(head) || startsWith(head, ZIP) || !looksLikeText(head)) {
      throw new ImportError("wrong-type");
    }
    return "txt";
  }
  throw new ImportError("wrong-type");
}
