import { describe, expect, it, vi } from "vitest";
import { mouseHover } from "./pointerHover";

describe("mouseHover", () => {
  it("reacts to a mouse", () => {
    const enter = vi.fn();
    const leave = vi.fn();
    const props = mouseHover(enter, leave);
    props.onPointerEnter({ pointerType: "mouse" });
    props.onPointerLeave({ pointerType: "mouse" });
    expect(enter).toHaveBeenCalledTimes(1);
    expect(leave).toHaveBeenCalledTimes(1);
  });

  it("ignores touch and pen so no highlight sticks after a tap", () => {
    const enter = vi.fn();
    const leave = vi.fn();
    const props = mouseHover(enter, leave);
    for (const pointerType of ["touch", "pen"] as const) {
      props.onPointerEnter({ pointerType });
      props.onPointerLeave({ pointerType });
    }
    expect(enter).not.toHaveBeenCalled();
    expect(leave).not.toHaveBeenCalled();
  });
});
