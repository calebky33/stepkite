import { beforeEach, describe, expect, it, vi } from "vitest";
import { extractText, joinPdfItems } from "./extract";
import { buildZip } from "./zip.testing";
import { ImportError, type ImportErrorCode } from "./file";

const pdfState = vi.hoisted(() => ({
  mode: "ok" as "ok" | "password" | "invalid" | "scan",
  pages: 3,
}));

vi.mock("pdfjs-dist/legacy/build/pdf.worker.mjs", () => ({ WorkerMessageHandler: {} }));
vi.mock("pdfjs-dist/legacy/build/pdf.mjs", () => ({
  getDocument: () => ({
    destroy: () => Promise.resolve(),
    promise: (() => {
      if (pdfState.mode === "password") {
        const error = new Error("No password given");
        error.name = "PasswordException";
        return Promise.reject(error);
      }
      if (pdfState.mode === "invalid") {
        const error = new Error("Invalid PDF structure.");
        error.name = "InvalidPDFException";
        return Promise.reject(error);
      }
      return Promise.resolve({
        numPages: pdfState.pages,
        getPage: () =>
          Promise.resolve({
            cleanup: () => undefined,
            getTextContent: () =>
              Promise.resolve({
                items:
                  pdfState.mode === "scan"
                    ? []
                    : [
                        { str: "Asha Rao", transform: [1, 0, 0, 1, 0, 700] },
                        { str: "Summary", transform: [1, 0, 0, 1, 0, 680] },
                        {
                          str: "Plans deliveries for four depots.",
                          transform: [1, 0, 0, 1, 0, 660],
                        },
                      ],
              }),
          }),
      });
    })(),
  }),
}));

const mammothState = vi.hoisted(() => ({ fail: false }));
vi.mock("mammoth", () => ({
  extractRawText: () =>
    mammothState.fail
      ? Promise.reject(new Error("Could not find main document part"))
      : Promise.resolve({ value: "Asha Rao\n\nSummary\n\nPlans deliveries for four depots." }),
}));

/** A minimal File: the reader only needs name, size and arrayBuffer(). */
function fakeFile(name: string, bytes: Uint8Array): File {
  return {
    name,
    size: bytes.byteLength,
    arrayBuffer: () =>
      Promise.resolve(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)),
  } as unknown as File;
}

const PDF = new TextEncoder().encode("%PDF-1.7 fake body");
const ZIP = buildZip([{ packed: 50, unpacked: 120 }]);

async function codeOf(file: File): Promise<ImportErrorCode | "none"> {
  try {
    await extractText(file);
    return "none";
  } catch (e) {
    return e instanceof ImportError ? e.code : "none";
  }
}

beforeEach(() => {
  pdfState.mode = "ok";
  pdfState.pages = 3;
  mammothState.fail = false;
});

describe("extractText", () => {
  it("reads a text file and cleans it", async () => {
    const text = "Asha​ Rao\r\nSummary\r\nPlans deliveries for four depots.";
    const out = await extractText(fakeFile("cv.txt", new TextEncoder().encode(text)));
    expect(out.kind).toBe("txt");
    expect(out.text).toBe("Asha Rao\nSummary\nPlans deliveries for four depots.");
  });

  it("reads a PDF page by page and reports progress", async () => {
    const seen: number[] = [];
    const out = await extractText(fakeFile("cv.pdf", PDF), (p) => {
      if (p.page) seen.push(p.page);
    });
    expect(seen).toEqual([1, 2, 3]);
    expect(out.text).toContain("Asha Rao\nSummary\nPlans deliveries");
  });

  it("refuses a PDF over the page cap before reading any page", async () => {
    pdfState.pages = 50;
    const seen: number[] = [];
    await expect(
      extractText(fakeFile("cv.pdf", PDF), (p) => {
        if (p.page) seen.push(p.page);
      }),
    ).rejects.toMatchObject({ code: "too-long" });
    expect(seen).toEqual([]);
  });

  it("refuses a DOCX that would expand past the cap, without calling mammoth", async () => {
    const bomb = buildZip([{ packed: 1000, unpacked: 30 * 1024 * 1024 }]);
    mammothState.fail = true;
    expect(await codeOf(fakeFile("cv.docx", bomb))).toBe("too-big");
  });

  it("stops between pages when cancelled", async () => {
    const controller = new AbortController();
    const seen: number[] = [];
    await expect(
      extractText(
        fakeFile("cv.pdf", PDF),
        (p) => {
          if (p.page) seen.push(p.page);
          if (p.page === 2) controller.abort();
        },
        controller.signal,
      ),
    ).rejects.toMatchObject({ code: "cancelled" });
    expect(seen).toEqual([1, 2]);
  });

  it("reads a DOCX", async () => {
    const out = await extractText(fakeFile("cv.docx", ZIP));
    expect(out.kind).toBe("docx");
    expect(out.text).toContain("Plans deliveries");
  });

  it("maps failures to a clear code", async () => {
    expect(await codeOf(fakeFile("cv.pdf", new Uint8Array()))).toBe("empty");
    expect(await codeOf(fakeFile("cv.exe", PDF))).toBe("wrong-type");
    expect(await codeOf(fakeFile("cv.txt", new Uint8Array([65, 0, 66, 0])))).toBe("wrong-type");
    pdfState.mode = "password";
    expect(await codeOf(fakeFile("cv.pdf", PDF))).toBe("password");
    pdfState.mode = "invalid";
    expect(await codeOf(fakeFile("cv.pdf", PDF))).toBe("corrupted");
    pdfState.mode = "scan";
    expect(await codeOf(fakeFile("cv.pdf", PDF))).toBe("scanned");
    mammothState.fail = true;
    expect(await codeOf(fakeFile("cv.docx", ZIP))).toBe("corrupted");
    expect(await codeOf(fakeFile("cv.txt", new TextEncoder().encode("   \n  ")))).toBe("no-text");
  });

  it("never sends the file anywhere", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    await extractText(
      fakeFile("cv.txt", new TextEncoder().encode("Asha Rao\nSummary\nPlans deliveries")),
    );
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("joinPdfItems", () => {
  it("starts a new line when the baseline moves and honours end of line marks", () => {
    expect(
      joinPdfItems([
        { str: "One", transform: [1, 0, 0, 1, 0, 100] },
        { str: " two", transform: [1, 0, 0, 1, 20, 100] },
        { str: "Three", transform: [1, 0, 0, 1, 0, 80] },
        { str: "Four", hasEOL: true, transform: [1, 0, 0, 1, 0, 80] },
        { str: "Five", transform: [1, 0, 0, 1, 0, 60] },
      ]),
    ).toBe("One two\nThreeFour\nFive");
  });
});
