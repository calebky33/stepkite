import { describe, expect, it } from "vitest";
import { cvFileName, printPageStyle, sanitiseFilePart } from "./print";

const DAY = new Date("2026-03-05T10:00:00.000Z");

describe("sanitiseFilePart", () => {
  it("turns spaces and symbols into single hyphens", () => {
    expect(sanitiseFilePart("Graduate UK / data role!")).toBe("Graduate-UK-data-role");
  });
  it("removes path and reserved characters", () => {
    expect(sanitiseFilePart('..\\..\\evil:*?"<>|name')).toBe("evil-name");
    expect(sanitiseFilePart("../../etc/passwd")).toBe("etc-passwd");
  });
  it("keeps letters from other scripts", () => {
    expect(sanitiseFilePart("आशा राव")).toBe("आशा-राव");
    expect(sanitiseFilePart("王小明 CV")).toBe("王小明-CV");
  });
  it("drops emoji and control characters", () => {
    expect(sanitiseFilePart("Sam\u0000 \u{1F680} Lee\n")).toBe("Sam-Lee");
  });
  it("limits the length without leaving a trailing hyphen", () => {
    const out = sanitiseFilePart(`${"a".repeat(59)} bbbb`);
    expect(out.length).toBeLessThanOrEqual(60);
    expect(out.endsWith("-")).toBe(false);
  });
  it("returns an empty string when nothing is usable", () => {
    expect(sanitiseFilePart(" /// ")).toBe("");
  });
});

describe("cvFileName", () => {
  it("uses the CV name, then the date", () => {
    expect(cvFileName("Graduate UK", "Asha Rao", "CV", DAY)).toBe("Graduate-UK-2026-03-05");
  });
  it("falls back to the person, then the document name", () => {
    expect(cvFileName("", "Asha Rao", "CV", DAY)).toBe("Asha-Rao-2026-03-05");
    expect(cvFileName("  ", "", "résumé", DAY)).toBe("résumé-2026-03-05");
    expect(cvFileName("", "", "", DAY)).toBe("cv-2026-03-05");
  });
});

describe("printPageStyle", () => {
  it("sets the paper size, no browser margins, colours and page breaks", () => {
    const a4 = printPageStyle("A4");
    expect(a4).toContain("size: A4");
    expect(a4).toContain("margin: 0");
    expect(a4).toContain("print-color-adjust: exact");
    expect(a4).toContain("break-inside: avoid");
    expect(printPageStyle("Letter")).toContain("size: Letter");
  });
});
