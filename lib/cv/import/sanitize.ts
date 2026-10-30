/**
 * File content is untrusted data. Everything that comes out of a file passes through here
 * before it is parsed, and it is only ever shown as plain React text.
 */

/** Total text kept from one file. Longer files are cut and the user is told. */
export const MAX_TEXT_CHARS = 60_000;

// Control characters (keeping tab and newline), the byte order mark, zero width characters,
// line and paragraph separators, bidirectional overrides and isolates, and the soft hyphen.
const UNSAFE = new RegExp(
  "[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u00AD\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]",
  "g",
);
const LINE_SEPARATORS = new RegExp("[\u2028\u2029\u000B\u000C]", "g");

/** Strips characters that hide or reorder text, and fixes line breaks. Does not change words. */
export function cleanText(input: string): string {
  return input
    .replace(/\r\n?/g, "\n")
    .replace(LINE_SEPARATORS, "\n")
    .replace(UNSAFE, "")
    .normalize("NFC");
}

/** Cleans a single value for a form field, on one line unless multiline is true. */
export function cleanValue(input: string, max: number, multiline = false): string {
  const cleaned = cleanText(input);
  const flat = multiline ? cleaned : cleaned.replace(/\s*\n\s*/g, " ");
  const trimmed = flat.replace(/[ \t]+/g, " ").trim();
  return trimmed.length > max ? trimmed.slice(0, max).trim() : trimmed;
}

/** Cleans and caps whole-file text. */
export function prepareText(raw: string): { text: string; cut: boolean } {
  const text = cleanText(raw);
  if (text.length <= MAX_TEXT_CHARS) return { text, cut: false };
  const window = text.slice(0, MAX_TEXT_CHARS);
  const newline = window.lastIndexOf("\n");
  return { text: window.slice(0, newline > 0 ? newline : MAX_TEXT_CHARS), cut: true };
}

const DIGIT_ZERO: readonly number[] = [
  0x0660, 0x06f0, 0x0966, 0x09e6, 0x0a66, 0x0ae6, 0x0b66, 0x0be6, 0x0c66, 0x0ce6, 0x0d66,
];

/** Maps Devanagari and other Indic or Arabic-Indic digits to 0 to 9. Same length as the input. */
export function asciiDigits(input: string): string {
  let out = "";
  for (const ch of input) {
    const code = ch.codePointAt(0) ?? 0;
    const zero = DIGIT_ZERO.find((z) => code >= z && code <= z + 9);
    out += zero === undefined ? ch : String(code - zero);
  }
  return out;
}
