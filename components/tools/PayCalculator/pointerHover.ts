import type { PointerEvent } from "react";

/**
 * Hover handlers that ignore touch and pen. Browsers fake a mouse enter after a tap and
 * never send the leave, so a mouse event handler leaves the highlight stuck on phones.
 */
export function mouseHover(onEnter: () => void, onLeave: () => void) {
  return {
    onPointerEnter: (event: Pick<PointerEvent, "pointerType">) => {
      if (event.pointerType === "mouse") onEnter();
    },
    onPointerLeave: (event: Pick<PointerEvent, "pointerType">) => {
      if (event.pointerType === "mouse") onLeave();
    },
  };
}
