import { SECTION_KEYS, type Cv, type SectionKey } from "./schema";

/** One piece of the CV that is never split across two pages. */
export type Block =
  | { key: string; kind: "header" }
  | { key: string; kind: "summary"; heading: boolean }
  | { key: string; kind: "experience"; id: string; heading: boolean }
  | { key: string; kind: "impact"; heading: boolean }
  | { key: string; kind: "education"; id: string; heading: boolean }
  | { key: string; kind: "skills"; id: string; heading: boolean };

export type Page = { blocks: Block[]; usedPx: number };

const LINE_PX = 20;
const HEADING_PX = 36;
const ENTRY_GAP_PX = 12;
const CHARS_PER_LINE = 90;

function lines(text: string): number {
  return Math.max(1, Math.ceil(text.length / CHARS_PER_LINE));
}

function hasContact(cv: Cv): boolean {
  const c = cv.contact;
  return Boolean(c.fullName || c.email || c.phone || c.city);
}

function orderedSections(cv: Cv): SectionKey[] {
  const seen = new Set<SectionKey>();
  for (const key of [...cv.sectionOrder, ...SECTION_KEYS]) seen.add(key);
  return [...seen];
}

/** Turns a CV into blocks in reading order. Empty sections produce no blocks. */
export function buildBlocks(cv: Cv): Block[] {
  const blocks: Block[] = [];
  if (hasContact(cv)) blocks.push({ key: "header", kind: "header" });
  for (const section of orderedSections(cv)) {
    if (section === "summary") {
      if (cv.summary.trim()) blocks.push({ key: "summary", kind: "summary", heading: true });
    } else if (section === "experience") {
      cv.experience.forEach((job, i) =>
        blocks.push({
          key: `experience-${job.id}`,
          kind: "experience",
          id: job.id,
          heading: i === 0,
        }),
      );
    } else if (section === "impact") {
      if (cv.impact.some((line) => line.trim())) {
        blocks.push({ key: "impact", kind: "impact", heading: true });
      }
    } else if (section === "education") {
      cv.education.forEach((item, i) =>
        blocks.push({
          key: `education-${item.id}`,
          kind: "education",
          id: item.id,
          heading: i === 0,
        }),
      );
    } else {
      cv.skills
        .filter((g) => g.label.trim() || g.items.length)
        .forEach((group, i) =>
          blocks.push({
            key: `skills-${group.id}`,
            kind: "skills",
            id: group.id,
            heading: i === 0,
          }),
        );
    }
  }
  return blocks;
}

/**
 * Fallback height in pixels when the browser has not measured a block yet (first paint, tests).
 * The preview replaces these with real measurements as soon as it can.
 */
export function estimateHeight(cv: Cv, block: Block): number {
  const heading = "heading" in block && block.heading ? HEADING_PX : 0;
  if (block.kind === "header") return 80;
  if (block.kind === "summary") return heading + lines(cv.summary) * LINE_PX + ENTRY_GAP_PX;
  if (block.kind === "experience") {
    const job = cv.experience.find((x) => x.id === block.id);
    const bullets = (job?.bullets ?? []).reduce((sum, b) => sum + lines(b) * LINE_PX, 0);
    return heading + 2 * LINE_PX + bullets + ENTRY_GAP_PX;
  }
  if (block.kind === "impact") {
    return heading + cv.impact.reduce((sum, b) => sum + lines(b) * LINE_PX, 0) + ENTRY_GAP_PX;
  }
  if (block.kind === "education") {
    const item = cv.education.find((x) => x.id === block.id);
    const details = item?.details ? lines(item.details) * LINE_PX : 0;
    return heading + 2 * LINE_PX + details + ENTRY_GAP_PX;
  }
  const group = cv.skills.find((x) => x.id === block.id);
  return heading + lines((group?.items ?? []).join(", ")) * LINE_PX + ENTRY_GAP_PX;
}

/**
 * Fills pages top to bottom and starts a new page whenever the next block would not fit.
 * A single block taller than a page gets a page of its own, and that page grows to fit it.
 * TODO: split a very long job between bullets instead of growing the page.
 */
export function paginate(
  blocks: readonly Block[],
  heightOf: (block: Block) => number,
  contentPx: number,
): Page[] {
  const pages: Page[] = [{ blocks: [], usedPx: 0 }];
  for (const block of blocks) {
    const h = heightOf(block);
    let page = pages[pages.length - 1];
    if (page && page.blocks.length > 0 && page.usedPx + h > contentPx) {
      page = { blocks: [], usedPx: 0 };
      pages.push(page);
    }
    if (page) {
      page.blocks.push(block);
      page.usedPx += h;
    }
  }
  return pages;
}
