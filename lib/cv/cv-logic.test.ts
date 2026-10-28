import { describe, expect, it } from "vitest";
import { moveItem, removeItem } from "./list";
import { buildBlocks, paginate } from "./paginate";
import { emptyCv } from "./schema";
import { APPROVED_ACCENTS, clampStyle } from "./style";

describe("list helpers", () => {
  it("moves an item without changing the input", () => {
    const input = ["a", "b", "c"];
    expect(moveItem(input, 0, 1)).toEqual(["b", "a", "c"]);
    expect(input).toEqual(["a", "b", "c"]);
  });
  it("ignores moves outside the list", () => {
    expect(moveItem(["a", "b"], 0, -1)).toEqual(["a", "b"]);
    expect(moveItem(["a", "b"], 1, 2)).toEqual(["a", "b"]);
  });
  it("removes by index", () => {
    expect(removeItem(["a", "b", "c"], 1)).toEqual(["a", "c"]);
  });
});

describe("clampStyle", () => {
  const base = emptyCv("x", "uk", "2026-01-01T00:00:00.000Z").style;
  it("pulls numbers inside the schema ranges", () => {
    const out = clampStyle({ ...base, fontScale: 5, marginMm: 1 });
    expect(out.fontScale).toBe(1.1);
    expect(out.marginMm).toBe(12);
    expect(clampStyle({ ...base, fontScale: Number.NaN }).fontScale).toBe(1);
  });
  it("only lets approved colours and fonts through", () => {
    expect(clampStyle({ ...base, accent: "red; background:url(x)" }).accent).toBe(
      APPROVED_ACCENTS[0],
    );
    expect(clampStyle({ ...base, fontPair: "evil" }).fontPair).toBe("system");
    expect(clampStyle({ ...base, accent: "#111827" }).accent).toBe("#111827");
  });
});

describe("paginate", () => {
  const cv = emptyCv("x", "uk", "2026-01-01T00:00:00.000Z");
  it("starts one empty page for an empty CV", () => {
    expect(paginate(buildBlocks(cv), () => 10, 100)).toEqual([{ blocks: [], usedPx: 0 }]);
  });
  it("never splits a block and moves it to the next page", () => {
    const filled = {
      ...cv,
      summary: "x",
      contact: { ...cv.contact, fullName: "A" },
      skills: [{ id: "s", label: "", items: ["a"] }],
    };
    const blocks = buildBlocks(filled);
    const pages = paginate(blocks, () => 60, 100);
    expect(pages.map((p) => p.blocks.length)).toEqual([1, 1, 1]);
  });
  it("gives an oversize block its own page", () => {
    const blocks = buildBlocks({ ...cv, summary: "x", contact: { ...cv.contact, fullName: "A" } });
    const pages = paginate(blocks, () => 500, 100);
    expect(pages).toHaveLength(2);
    expect(pages[0]?.usedPx).toBe(500);
  });
});
