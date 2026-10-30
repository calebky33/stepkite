/** Test helper: hand-built tiny ZIP bytes (central directory and end record only). */
export type ZipEntry = { packed: number; unpacked: number };

/** Builds only a central directory and end record. That is all checkZip reads. */
export function buildZip(entries: ZipEntry[], opts: { count?: number } = {}): Uint8Array {
  const name = new TextEncoder().encode("a.xml");
  const dirSize = entries.length * (46 + name.length);
  const out = new Uint8Array(4 + dirSize + 22);
  const view = new DataView(out.buffer);
  out.set([0x50, 0x4b, 0x03, 0x04]); // local header mark, so the type check passes
  entries.forEach((e, i) => {
    const at = 4 + i * (46 + name.length);
    view.setUint32(at, 0x02014b50, true);
    view.setUint32(at + 20, e.packed, true);
    view.setUint32(at + 24, e.unpacked, true);
    view.setUint16(at + 28, name.length, true);
    out.set(name, at + 46);
  });
  const end = 4 + dirSize;
  view.setUint32(end, 0x06054b50, true);
  view.setUint16(end + 8, opts.count ?? entries.length, true);
  view.setUint16(end + 10, opts.count ?? entries.length, true);
  view.setUint32(end + 12, dirSize, true);
  view.setUint32(end + 16, 4, true);
  return out;
}
