/** Pure list helpers for the CV editor. They never change the input array. */

export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return [...items];
  }
  const next = [...items];
  const [picked] = next.splice(from, 1);
  if (picked === undefined) return [...items];
  next.splice(to, 0, picked);
  return next;
}

export function removeItem<T>(items: readonly T[], index: number): T[] {
  return items.filter((_, i) => i !== index);
}
