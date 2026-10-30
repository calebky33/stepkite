import type { CvRules } from "./rules/types";

const MAX_NAME = 60;

/** Keeps letters, marks and numbers in any script, so Hindi and Chinese names survive. */
export function sanitiseFilePart(text: string): string {
  return text
    .normalize("NFC")
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_NAME)
    .replace(/-+$/g, "");
}

/** Name of the downloaded PDF without the extension: CV name, else person, else CV, then the date. */
export function cvFileName(
  title: string,
  fullName: string,
  documentName: string,
  date: Date,
): string {
  const base =
    sanitiseFilePart(title) || sanitiseFilePart(fullName) || sanitiseFilePart(documentName) || "cv";
  return `${base}-${date.toISOString().slice(0, 10)}`;
}

/** Print CSS for the cloned pages. Page margins are 0 so browsers have no room for headers. */
export function printPageStyle(paper: CvRules["paper"]): string {
  return `
@page { size: ${paper}; margin: 0; }
html, body { margin: 0; padding: 0; background: #fff; }
* { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.cv-print-page { break-after: page; break-inside: avoid; overflow: hidden; }
.cv-print-page:last-child { break-after: auto; }
[data-block] { break-inside: avoid; }
`;
}
