/**
 * Turns a chosen file into plain text, in the browser. The file is read from memory and never
 * sent anywhere. pdfjs-dist and mammoth are loaded with import() here and nowhere else, so they
 * only download after someone chooses a file, and only on the CV page.
 *
 * Text only: nothing in the file is rendered, run or followed. PDFs are opened with scripts,
 * XFA forms and font loading switched off. The legacy build is used so older browsers work.
 *
 * CSP: proxy.ts allows scripts from 'self' only (no blob:, no unsafe-eval). So the PDF worker
 * is not started as a Worker. The worker module is imported as a normal same origin chunk and
 * run on the main thread ("fake worker"). The page is capped at 20 pages, so it stays short.
 */
import { checkFile, ImportError, MAX_FILE_BYTES, MAX_PDF_PAGES, type FileKind } from "./file";
import { prepareText } from "./sanitize";
import { checkZip } from "./zip";

export type Progress = { step: "checking" | "reading" | "done"; page?: number; pages?: number };

export type Extracted = { text: string; kind: FileKind; notes: string[] };

const TIMEOUT_MS = 30_000;

function withTimeout<T>(work: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limit = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new ImportError("timeout")), TIMEOUT_MS);
  });
  return Promise.race([work, limit]).finally(() => clearTimeout(timer));
}

async function readBytes(file: File): Promise<Uint8Array> {
  try {
    return new Uint8Array(await file.arrayBuffer());
  } catch {
    throw new ImportError("corrupted");
  }
}

function decodeText(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(bytes);
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder("utf-16be").decode(bytes);
  return new TextDecoder("utf-8").decode(bytes.subarray(0, 400_000));
}

type PdfItem = { str?: string; hasEOL?: boolean; transform?: number[] };

/** Joins text items into lines. A new line starts when hasEOL is set or the baseline moves. */
export function joinPdfItems(items: readonly PdfItem[]): string {
  let out = "";
  let lastY: number | null = null;
  for (const item of items) {
    if (typeof item.str !== "string") continue;
    const y = item.transform?.[5];
    if (lastY !== null && typeof y === "number" && Math.abs(y - lastY) > 2 && !out.endsWith("\n")) {
      out += "\n";
    }
    out += item.str;
    if (typeof y === "number") lastY = y;
    if (item.hasEOL) out += "\n";
  }
  return out;
}

function pdfErrorCode(error: unknown): ImportError {
  if (error instanceof ImportError) return error;
  const name = error instanceof Error ? error.name : "";
  if (name === "PasswordException") return new ImportError("password");
  return new ImportError("corrupted");
}

function stopIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw new ImportError("cancelled");
}

async function extractPdf(
  bytes: Uint8Array,
  onProgress: (p: Progress) => void,
  signal?: AbortSignal,
): Promise<{ text: string; notes: string[] }> {
  let pdfjs: typeof import("pdfjs-dist/legacy/build/pdf.mjs");
  try {
    pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const holder = globalThis as { pdfjsWorker?: unknown };
    if (!holder.pdfjsWorker)
      holder.pdfjsWorker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
  } catch {
    throw new ImportError("unavailable");
  }
  const notes: string[] = [];
  let task: ReturnType<typeof pdfjs.getDocument> | undefined;
  try {
    task = pdfjs.getDocument({
      data: bytes,
      enableXfa: false,
      disableFontFace: true,
      useSystemFonts: false,
      stopAtErrors: false,
    });
    const doc = await task.promise;
    stopIfAborted(signal);
    if (doc.numPages > MAX_PDF_PAGES) throw new ImportError("too-long");
    const pages = doc.numPages;
    let text = "";
    for (let n = 1; n <= pages; n++) {
      stopIfAborted(signal);
      onProgress({ step: "reading", page: n, pages });
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      stopIfAborted(signal);
      text += `${joinPdfItems(content.items as PdfItem[])}\n\n`;
      page.cleanup();
      if (text.length > 200_000) break;
    }
    return { text, notes };
  } catch (error) {
    throw pdfErrorCode(error);
  } finally {
    await task?.destroy().catch(() => undefined);
  }
}

async function extractDocx(bytes: Uint8Array): Promise<string> {
  // Refuse a zip bomb before mammoth inflates anything.
  checkZip(bytes);
  let mammoth: typeof import("mammoth");
  try {
    mammoth = await import("mammoth");
  } catch {
    throw new ImportError("unavailable");
  }
  try {
    const copy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const result = await mammoth.extractRawText({ arrayBuffer: copy as ArrayBuffer });
    return result.value;
  } catch {
    throw new ImportError("corrupted");
  }
}

/** Checks, reads and cleans a file. Throws ImportError with a code the screen explains. */
export async function extractText(
  file: File,
  onProgress: (p: Progress) => void = () => undefined,
  signal?: AbortSignal,
): Promise<Extracted> {
  onProgress({ step: "checking" });
  if (file.size > MAX_FILE_BYTES) throw new ImportError("too-big");
  const bytes = await readBytes(file);
  stopIfAborted(signal);
  const kind = checkFile(file.name, file.size, bytes.subarray(0, 4096));
  onProgress({ step: "reading" });
  const notes: string[] = [];
  let raw: string;
  if (kind === "pdf") {
    const pdf = await withTimeout(extractPdf(bytes, onProgress, signal));
    raw = pdf.text;
    notes.push(...pdf.notes);
  } else if (kind === "docx") {
    raw = await withTimeout(extractDocx(bytes));
  } else {
    raw = decodeText(bytes);
  }
  stopIfAborted(signal);
  const { text, cut } = prepareText(raw);
  if (cut) notes.push("The file was very long, so the end was left out.");
  if (text.replace(/\s/g, "").length < 20) {
    throw new ImportError(kind === "pdf" ? "scanned" : "no-text");
  }
  onProgress({ step: "done" });
  return { text, kind, notes };
}
