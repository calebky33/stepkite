import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

/** Attribute that marks a row's Edit button, valued with the row id. */
export const EDIT_ATTR = "data-edit-for";

/**
 * Puts focus back after a save or delete unmounts the control that had it.
 * Goes to the row's Edit button if it still exists, else the heading marked tabIndex -1.
 */
export function useFocusReturn(
  root: RefObject<HTMLElement | null>,
  heading: RefObject<HTMLElement | null>,
) {
  const [request, setRequest] = useState<{ id: string | null; n: number } | null>(null);
  const count = useRef(0);

  useEffect(() => {
    if (!request) return;
    const edit = request.id
      ? root.current?.querySelector<HTMLElement>(`[${EDIT_ATTR}="${CSS.escape(request.id)}"]`)
      : null;
    (edit ?? heading.current)?.focus();
  }, [request, root, heading]);

  return useCallback((rowId: string | null) => {
    count.current += 1;
    setRequest({ id: rowId, n: count.current });
  }, []);
}
