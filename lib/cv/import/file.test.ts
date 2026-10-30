import { describe, expect, it } from "vitest";
import {
  checkFile,
  IMPORT_ERRORS,
  ImportError,
  MAX_FILE_BYTES,
  type ImportErrorCode,
} from "./file";

const bytes = (...b: number[]) => new Uint8Array(b);
const PDF = bytes(0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37);
const ZIP = bytes(0x50, 0x4b, 0x03, 0x04, 0, 0);
const TEXT = new TextEncoder().encode("Asha Rao\nSummary\n");
const OLD_DOC = bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1);

const codeOf = (fn: () => unknown): ImportErrorCode | null => {
  try {
    fn();
    return null;
  } catch (e) {
    return e instanceof ImportError ? e.code : null;
  }
};

describe("checkFile", () => {
  it("accepts a real PDF, DOCX and TXT by extension and first bytes", () => {
    expect(checkFile("cv.pdf", 100, PDF)).toBe("pdf");
    expect(checkFile("CV.DOCX", 100, ZIP)).toBe("docx");
    expect(checkFile("cv.txt", 100, TEXT)).toBe("txt");
  });

  it("rejects a file whose extension and bytes disagree", () => {
    expect(codeOf(() => checkFile("cv.pdf", 100, ZIP))).toBe("wrong-type");
    expect(codeOf(() => checkFile("cv.docx", 100, PDF))).toBe("wrong-type");
    expect(codeOf(() => checkFile("cv.txt", 100, PDF))).toBe("wrong-type");
    expect(codeOf(() => checkFile("cv.txt", 100, ZIP))).toBe("wrong-type");
    expect(codeOf(() => checkFile("cv.txt", 100, bytes(0x41, 0, 0x42)))).toBe("wrong-type");
  });

  it("decides by name and bytes, never by a MIME type", () => {
    expect(codeOf(() => checkFile("photo.png", 100, bytes(0x89, 0x50, 0x4e, 0x47)))).toBe(
      "wrong-type",
    );
    expect(codeOf(() => checkFile("noextension", 100, TEXT))).toBe("wrong-type");
  });

  it("explains old .doc files", () => {
    expect(codeOf(() => checkFile("cv.doc", 100, OLD_DOC))).toBe("old-word");
    expect(codeOf(() => checkFile("cv.docx", 100, OLD_DOC))).toBe("old-word");
  });

  it("rejects empty and over 5 MB files", () => {
    expect(codeOf(() => checkFile("cv.pdf", 0, PDF))).toBe("empty");
    expect(codeOf(() => checkFile("cv.pdf", MAX_FILE_BYTES + 1, PDF))).toBe("too-big");
    expect(checkFile("cv.pdf", MAX_FILE_BYTES, PDF)).toBe("pdf");
  });

  it("accepts UTF-16 text with a byte order mark", () => {
    expect(checkFile("cv.txt", 100, bytes(0xff, 0xfe, 0x41, 0x00))).toBe("txt");
  });
});

describe("error messages", () => {
  it("are plain text with no dashes, slashes or exclamation marks", () => {
    for (const message of Object.values(IMPORT_ERRORS)) {
      expect(message.length).toBeGreaterThan(10);
      expect(message).not.toMatch(/[–—/!]| - /);
    }
  });
});
