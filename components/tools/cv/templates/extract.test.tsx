import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { COUNTRY_INFO } from "@/lib/countries";
import { exampleCv } from "@/lib/cv/example";
import { buildBlocks } from "@/lib/cv/paginate";
import { emptyCv, SECTION_KEYS, type Cv, type SectionKey } from "@/lib/cv/schema";
import { templatesFor } from ".";

const NOW = "2026-01-01T00:00:00.000Z";
const COUNTRIES = ["uk", "us", "in"] as const;

const HEADING_TO_SECTION: Record<string, SectionKey> = {
  Summary: "summary",
  "Personal statement": "summary",
  "Career objective": "summary",
  Experience: "experience",
  "Work experience": "experience",
  "Quantified impact": "impact",
  Education: "education",
  Skills: "skills",
  Certifications: "certifications",
  Interests: "interests",
  References: "references",
};

const REVERSED: SectionKey[] = [...SECTION_KEYS].reverse();

/** Every section filled, with a unique marker in each user string so repeats are easy to count. */
function worstCase(country: (typeof COUNTRIES)[number], order: SectionKey[]): Cv {
  const long = (marker: string) => `${marker} ${"unbroken".repeat(30)} ${"x".repeat(150)}`;
  return {
    ...emptyCv("worst", country, NOW),
    sectionOrder: order,
    contact: {
      fullName: `Zq01 ${"Wolfeschlegelsteinhausenbergerdorff".repeat(3)}`,
      email: "zq02.very.long.address.for.testing@example.com",
      phone: "+44 7700 900123",
      city: "Zq03 नई दिल्ली 東京",
      links: [{ label: "Zq04", url: "https://example.com/zq04/" + "a".repeat(120) }],
    },
    summary: long("Zq05 नमस्ते दुनिया 你好世界"),
    experience: [1, 2, 3].map((n) => ({
      id: `job-${n}`,
      role: `Zq1${n} role`,
      employer: `Zq2${n} employer`,
      location: `Zq3${n} place`,
      start: "2019-01",
      end: n === 1 ? null : "2020-12",
      bullets: [long(`Zq4${n}a`), long(`Zq4${n}b`), `Zq4${n}c emoji ok`],
    })),
    impact: [long("Zq60"), "Zq61 cut costs by 12 percent"],
    education: [
      {
        id: "edu-1",
        qualification: "Zq70 degree",
        institution: "Zq71 university",
        start: "2015-09",
        end: "2018-06",
        details: long("Zq72"),
      },
    ],
    skills: [
      { id: "sk-1", label: "Zq80 tools", items: ["Zq81", "Zq82", "Zq83"] },
      { id: "sk-2", label: "Zq84 languages", items: ["Zq85", "Zq86"] },
    ],
    certifications: [{ id: "c1", name: "Zq90 certificate", issuer: "Zq91 body", date: "2023-05" }],
    interests: long("Zq92"),
    references: [{ id: "r1", name: "Zq93 person", role: "Zq94 role", contact: "zq95@example.com" }],
  };
}

function example(country: (typeof COUNTRIES)[number], order: SectionKey[]): Cv {
  return {
    ...exampleCv(emptyCv("ex", country, NOW)),
    sectionOrder: order,
    impact: ["Zq61 cut costs by 12 percent"],
    certifications: [{ id: "c1", name: "Zq90 certificate", issuer: "Zq91 body", date: "2023-05" }],
    interests: "Zq92 chess",
    references: [{ id: "r1", name: "Zq93 person", role: "Zq94 role", contact: "zq95@example.com" }],
  };
}

/** Words that should each show up exactly once, with the section each belongs to. */
const MARKERS: [string, SectionKey | "header"][] = [
  ["Zq01", "header"],
  ["zq02", "header"],
  ["Zq05", "summary"],
  ["Zq11 role", "experience"],
  ["Zq23 employer", "experience"],
  ["Zq43c", "experience"],
  ["Zq60", "impact"],
  ["Zq61", "impact"],
  ["Zq70", "education"],
  ["Zq72", "education"],
  ["Zq80", "skills"],
  ["Zq86", "skills"],
  ["Zq90", "certifications"],
  ["Zq92", "interests"],
  ["Zq93", "references"],
];

const CASES = COUNTRIES.flatMap((country) =>
  templatesFor(country).flatMap((t) =>
    [
      ["worst case", worstCase(country, [...SECTION_KEYS])] as const,
      ["worst case, reversed order", worstCase(country, REVERSED)] as const,
      ["example", example(country, [...SECTION_KEYS])] as const,
      ["example, reversed order", example(country, REVERSED)] as const,
    ].map(([label, cv]) => [country, t.id, label, t, cv] as const),
  ),
);

const count = (text: string, needle: string) => text.split(needle).length - 1;

describe("text extraction", () => {
  it.each(CASES)("%s %s (%s) reads in order with nothing repeated", (country, _id, _l, t, cv) => {
    const { container } = render(
      <t.Component cv={cv} blocks={buildBlocks(cv)} locale={COUNTRY_INFO[country].locale} />,
    );
    const text = container.textContent ?? "";
    const isWorst = cv.id === "worst";

    // Headings: one per filled section, in the order of cv.sectionOrder.
    const headings = [...container.querySelectorAll("h3")].map((h) => h.textContent ?? "");
    const sections = headings.map((h) => HEADING_TO_SECTION[h]);
    expect(sections.every(Boolean)).toBe(true);
    expect(new Set(sections).size).toBe(sections.length);
    const expectedOrder = cv.sectionOrder.filter((s) => sections.includes(s));
    expect(sections).toEqual(expectedOrder);
    if (isWorst) expect(sections).toHaveLength(SECTION_KEYS.length);

    // Every marker shows once, and sections follow cv.sectionOrder in the text.
    const present = MARKERS.filter(([m]) => text.includes(m));
    if (isWorst) expect(present).toHaveLength(MARKERS.length);
    for (const [marker] of present) expect(count(text, marker)).toBe(1);
    const positions = present
      .filter(([, s]) => s !== "header")
      .map(([m, s]) => [cv.sectionOrder.indexOf(s as SectionKey), text.indexOf(m)] as const);
    const byText = [...positions].sort((a, b) => a[1] - b[1]).map((p) => p[0]);
    expect(byText).toEqual([...byText].sort((a, b) => a - b));
    const firstSection = Math.min(...positions.map((p) => p[1]));
    for (const [m, s] of present) {
      if (s === "header") expect(text.indexOf(m)).toBeLessThan(firstSection);
    }

    // Plain text only: no tables or graphics, so a tracking system reads it in DOM order.
    expect(container.querySelector("table, img, canvas, svg")).toBeNull();
  });
});
