import { describe, expect, it } from "vitest";
import { ImportError } from "./file";
import { buildZip as zip } from "./zip.testing";
import { checkZip, MAX_UNCOMPRESSED_BYTES, MAX_ZIP_ENTRIES } from "./zip";

const codeOf = (fn: () => void): string | null => {
  try {
    fn();
    return null;
  } catch (error) {
    return error instanceof ImportError ? error.code : "other";
  }
};

describe("checkZip", () => {
  it("accepts a small ordinary archive", () => {
    expect(codeOf(() => checkZip(zip([{ packed: 400, unpacked: 1200 }])))).toBeNull();
  });

  it("refuses a total over the cap", () => {
    const each = Math.floor(MAX_UNCOMPRESSED_BYTES / 2) + 1;
    const bytes = zip([
      { packed: each, unpacked: each },
      { packed: each, unpacked: each },
    ]);
    expect(codeOf(() => checkZip(bytes))).toBe("too-big");
  });

  it("refuses one entry over the cap", () => {
    const bytes = zip([{ packed: 1000, unpacked: MAX_UNCOMPRESSED_BYTES + 1 }]);
    expect(codeOf(() => checkZip(bytes))).toBe("too-big");
  });

  it("refuses too many entries", () => {
    const many = Array.from({ length: MAX_ZIP_ENTRIES + 1 }, () => ({ packed: 1, unpacked: 1 }));
    expect(codeOf(() => checkZip(zip(many)))).toBe("too-big");
  });

  it("refuses an absurd compression ratio", () => {
    const bytes = zip([{ packed: 100, unpacked: 5 * 1024 * 1024 }]);
    expect(codeOf(() => checkZip(bytes))).toBe("too-big");
  });

  it("calls bytes with no end record corrupted", () => {
    expect(codeOf(() => checkZip(new Uint8Array(64)))).toBe("corrupted");
  });

  it("calls a directory that runs off the end corrupted", () => {
    const bytes = zip([{ packed: 1, unpacked: 1 }], { count: 3 });
    expect(codeOf(() => checkZip(bytes))).toBe("corrupted");
  });
});
