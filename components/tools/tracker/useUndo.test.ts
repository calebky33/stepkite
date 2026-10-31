import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useUndo } from "./useUndo";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useUndo", () => {
  it("runs the replaced entry's onExpire synchronously when a newer entry replaces it", () => {
    const { result } = renderHook(() => useUndo());
    const first = vi.fn();
    const second = vi.fn();
    act(() => {
      result.current.offer({ message: "First", undo: () => undefined, onExpire: first });
    });
    act(() => {
      result.current.offer({ message: "Second", undo: () => undefined, onExpire: second });
    });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
  });

  it("runs the entry's onExpire on dismiss too", () => {
    const { result } = renderHook(() => useUndo());
    const expire = vi.fn();
    act(() => {
      result.current.offer({ message: "One", undo: () => undefined, onExpire: expire });
    });
    act(() => {
      result.current.dismiss();
    });
    expect(expire).toHaveBeenCalledTimes(1);
  });

  it("does not run onExpire when undo is pressed", () => {
    const { result } = renderHook(() => useUndo());
    const expire = vi.fn();
    const undo = vi.fn();
    act(() => {
      result.current.offer({ message: "One", undo, onExpire: expire });
    });
    act(() => {
      result.current.run();
    });
    expect(undo).toHaveBeenCalledTimes(1);
    expect(expire).not.toHaveBeenCalled();
  });

  it("runs onExpire when the 10 second timer fires", () => {
    const { result } = renderHook(() => useUndo());
    const expire = vi.fn();
    act(() => {
      result.current.offer({ message: "One", undo: () => undefined, onExpire: expire });
    });
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(expire).toHaveBeenCalledTimes(1);
  });
});
