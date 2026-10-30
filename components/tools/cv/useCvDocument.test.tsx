import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Cv } from "@/lib/cv/schema";

vi.mock("@/lib/storage/db", () => import("@/lib/storage/memoryDb"));

const saves = vi.hoisted(() => ({
  calls: [] as { cv: { id: string; title: string }; finish: () => void }[],
  active: 0,
  maxActive: 0,
  manual: true,
}));

vi.mock("@/lib/storage/cvStore", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/storage/cvStore")>("@/lib/storage/cvStore");
  return {
    ...actual,
    maybeSnapshot: vi.fn().mockResolvedValue({ ok: true, value: false }),
    saveCv: (cv: { id: string; title: string }) => {
      saves.active += 1;
      saves.maxActive = Math.max(saves.maxActive, saves.active);
      return new Promise((resolve) => {
        const finish = () => {
          saves.active -= 1;
          resolve({ ok: true, value: null });
        };
        saves.calls.push({ cv: { id: cv.id, title: cv.title }, finish });
        if (!saves.manual) finish();
      });
    },
  };
});

import { resetMemoryDb } from "@/lib/storage/memoryDb";
import { AUTOSAVE_MS, useCvDocument } from "./useCvDocument";

const rename = (title: string) => (d: Cv) => ({ ...d, title });

async function ready(result: { current: ReturnType<typeof useCvDocument> }) {
  await waitFor(() => expect(result.current.cv).not.toBeNull());
}

beforeEach(() => {
  resetMemoryDb();
  saves.calls = [];
  saves.active = 0;
  saves.maxActive = 0;
  saves.manual = true;
});
afterEach(() => {
  vi.useRealTimers();
});

describe("useCvDocument saving", () => {
  it("never overlaps writes, and a stale result does not mark newer edits saved", async () => {
    const { result } = renderHook(() => useCvDocument("uk", "cv-a"));
    await ready(result);
    vi.useFakeTimers();

    act(() => result.current.edit(rename("one")));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTOSAVE_MS);
    });
    expect(saves.calls).toHaveLength(1);

    act(() => result.current.edit(rename("two")));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTOSAVE_MS);
    });
    // The second write waits for the first.
    expect(saves.calls).toHaveLength(1);

    act(() => result.current.edit(rename("three")));
    await act(async () => {
      saves.calls[0]?.finish();
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.saveState).toBe("saving");
    expect(saves.calls).toHaveLength(2);
    expect(saves.calls[1]?.cv.title).toBe("two");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTOSAVE_MS);
      saves.calls[1]?.finish();
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(saves.calls).toHaveLength(3);
    expect(saves.calls[2]?.cv.title).toBe("three");
    await act(async () => {
      saves.calls[2]?.finish();
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.saveState).toBe("saved");
    expect(saves.maxActive).toBe(1);
  });

  it("saveNow waits for writes already under way", async () => {
    const { result } = renderHook(() => useCvDocument("uk", "cv-a"));
    await ready(result);
    act(() => result.current.edit(rename("one")));
    let done = false;
    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.saveNow().then(() => {
        done = true;
      });
    });
    await waitFor(() => expect(saves.calls).toHaveLength(1));
    expect(done).toBe(false);
    await act(async () => {
      saves.calls[0]?.finish();
      await pending;
    });
    expect(done).toBe(true);
  });

  it("saves a pending edit into the old CV, never the new one, when the id changes", async () => {
    saves.manual = false;
    const { result, rerender } = renderHook(({ id }) => useCvDocument("uk", id), {
      initialProps: { id: "cv-a" },
    });
    await ready(result);
    act(() => result.current.edit(rename("Only for A")));
    rerender({ id: "cv-b" });
    await waitFor(() => expect(saves.calls.length).toBeGreaterThan(0));
    await waitFor(() => expect(result.current.cv?.id).toBe("cv-b"));
    expect(saves.calls.every((c) => c.cv.id === "cv-a" && c.cv.title === "Only for A")).toBe(true);
    expect(result.current.cv?.title).not.toBe("Only for A");
    expect(result.current.canUndo).toBe(false);
  });

  it("does not carry a blocked state to the next CV", async () => {
    saves.manual = false;
    const { result, rerender } = renderHook(({ id }) => useCvDocument("uk", id), {
      initialProps: { id: "cv-a" },
    });
    await ready(result);
    rerender({ id: "cv-b" });
    await waitFor(() => expect(result.current.cv?.id).toBe("cv-b"));
    act(() => result.current.edit(rename("B title")));
    await act(async () => {
      await result.current.saveNow();
    });
    expect(saves.calls.map((c) => c.cv.id)).toEqual(["cv-b"]);
  });

  it("leaves Ctrl+Z to a text field", async () => {
    const { result } = renderHook(() => useCvDocument("uk", "cv-a"));
    await ready(result);
    act(() => result.current.edit(rename("one")));
    const input = document.createElement("input");
    document.body.appendChild(input);
    const event = new KeyboardEvent("keydown", {
      key: "z",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    act(() => {
      input.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(false);
    expect(result.current.cv?.title).toBe("one");
    input.remove();
  });
});
