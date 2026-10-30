/**
 * Reads only the central directory of a ZIP (a .docx is a ZIP) so a file that would expand
 * into something huge is refused before any parser inflates it. Pure, nothing is decompressed.
 */
import { ImportError } from "./file";

export const MAX_UNCOMPRESSED_BYTES = 25 * 1024 * 1024;
export const MAX_ZIP_ENTRIES = 1000;
/** A real Word file rarely compresses past 30 to 1. Anything past this is refused as too big. */
export const MAX_RATIO = 200;

const EOCD_SIG = 0x06054b50;
const CENTRAL_SIG = 0x02014b50;
const ZIP64_MARK = 0xffffffff;

/** Throws ImportError("too-big") when the archive is too big, too crowded or too squeezed, and "corrupted" when it is damaged. */
export function checkZip(bytes: Uint8Array): void {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // The end record sits in the last 22 bytes plus up to 65535 bytes of comment.
  let eocd = -1;
  const lowest = Math.max(0, bytes.length - 22 - 0xffff);
  for (let i = bytes.length - 22; i >= lowest; i--) {
    if (view.getUint32(i, true) === EOCD_SIG) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new ImportError("corrupted");
  const count = view.getUint16(eocd + 10, true);
  const size = view.getUint32(eocd + 12, true);
  const offset = view.getUint32(eocd + 16, true);
  if (count === 0xffff || size === ZIP64_MARK || offset === ZIP64_MARK) {
    throw new ImportError("too-big");
  }
  if (count > MAX_ZIP_ENTRIES) throw new ImportError("too-big");
  if (offset + size > bytes.length) throw new ImportError("corrupted");

  let pos = offset;
  let total = 0;
  for (let n = 0; n < count; n++) {
    if (pos + 46 > bytes.length || view.getUint32(pos, true) !== CENTRAL_SIG) {
      throw new ImportError("corrupted");
    }
    const packed = view.getUint32(pos + 20, true);
    const unpacked = view.getUint32(pos + 24, true);
    const nameLen = view.getUint16(pos + 28, true);
    const extraLen = view.getUint16(pos + 30, true);
    const commentLen = view.getUint16(pos + 32, true);
    if (packed === ZIP64_MARK || unpacked === ZIP64_MARK) throw new ImportError("too-big");
    if (unpacked > MAX_UNCOMPRESSED_BYTES) throw new ImportError("too-big");
    // A ratio only means something once the entry is big enough to matter.
    if (unpacked > 1024 * 1024 && unpacked / Math.max(packed, 1) > MAX_RATIO) {
      throw new ImportError("too-big");
    }
    total += unpacked;
    if (total > MAX_UNCOMPRESSED_BYTES) throw new ImportError("too-big");
    pos += 46 + nameLen + extraLen + commentLen;
  }
}
