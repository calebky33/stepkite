import { describe, expect, it } from "vitest";
import { canRedo, canUndo, HISTORY_LIMIT, recordEdit, redo, startHistory, undo } from "./history";

const STEP = 5000;

function typeN(n: number) {
  let h = startHistory(0);
  for (let i = 1; i <= n; i += 1) h = recordEdit(h, i, i * STEP);
  return h;
}

describe("undo and redo", () => {
  it("keeps only the last 50 changes", () => {
    const h = typeN(80);
    expect(h.past).toHaveLength(HISTORY_LIMIT);
    let back = h;
    for (let i = 0; i < 100; i += 1) back = undo(back);
    expect(back.present).toBe(80 - HISTORY_LIMIT);
    expect(canUndo(back)).toBe(false);
  });

  it("redoes what was undone and clears redo after a new edit", () => {
    let h = undo(undo(typeN(3)));
    expect(h.present).toBe(1);
    expect(canRedo(h)).toBe(true);
    h = redo(h);
    expect(h.present).toBe(2);
    h = recordEdit(undo(h), 99, 99 * STEP);
    expect(canRedo(h)).toBe(false);
  });

  it("merges quick edits into one step", () => {
    let h = recordEdit(startHistory("a"), "ab", 10_000);
    h = recordEdit(h, "abc", 10_300);
    h = recordEdit(h, "abcd", 10_600);
    expect(h.past).toEqual(["a"]);
    expect(undo(h).present).toBe("a");
  });

  it("does nothing at the ends", () => {
    const h = startHistory(1);
    expect(undo(h)).toBe(h);
    expect(redo(h)).toBe(h);
  });
});

describe("forced steps", () => {
  it("does not merge a forced step into the previous edit", () => {
    let h = startHistory(0);
    h = recordEdit(h, 1, 100);
    h = recordEdit(h, 2, 200);
    h = recordEdit(h, 3, 300, true);
    expect(undo(h).present).toBe(2);
    expect(undo(undo(h)).present).toBe(0);
  });
});
