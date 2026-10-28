import { describe, expect, it } from "vitest";
import { parseCvText } from "./parse";

const SAMPLE = `Asha Rao
asha@example.com

Profile
Operations lead who plans deliveries
and keeps suppliers on schedule.

Work Experience
Operations lead, Northfield Supplies, Leeds
Jan 2021 - Present
• Plan weekly deliveries for 4 depots
• Agree dates with suppliers
Warehouse assistant at Harbour Goods
06/2018 to 02/2021
- Picked and packed orders

Technical Skills
Languages: Excel, SQL; Python 3
Scheduling | Stock counts

Key Achievements
• Cut late orders by 18% in one quarter
• Led the depot move
• Trained 2 new starters and wrote the guide

Education
BSc Business, University of Leeds
2014 - 2017
Grade: 2:1

Interests
Running
`;

const digits = (text: string): string[] => text.match(/\d+/g) ?? [];

describe("parseCvText headings and entries", () => {
  const parsed = parseCvText(SAMPLE);

  it("finds the summary and joins wrapped lines", () => {
    expect(parsed.summary).toBe(
      "Operations lead who plans deliveries and keeps suppliers on schedule.",
    );
  });

  it("splits jobs by date range and copies bullets as written", () => {
    expect(parsed.experience).toHaveLength(2);
    const [first, second] = parsed.experience;
    expect(first).toMatchObject({
      role: "Operations lead",
      employer: "Northfield Supplies",
      location: "Leeds",
      start: "2021-01",
      end: null,
      bullets: ["Plan weekly deliveries for 4 depots", "Agree dates with suppliers"],
    });
    expect(second).toMatchObject({
      role: "Warehouse assistant",
      employer: "Harbour Goods",
      start: "2018-06",
      end: "2021-02",
      bullets: ["Picked and packed orders"],
    });
  });

  it("maps skills to the tech stack and ignores unknown sections", () => {
    expect(parsed.techStack).toEqual(["Excel", "SQL", "Python 3", "Scheduling", "Stock counts"]);
    expect(JSON.stringify(parsed)).not.toContain("Running");
  });

  it("reads education with its dates and details", () => {
    expect(parsed.education).toEqual([
      {
        qualification: "BSc Business",
        institution: "University of Leeds",
        start: "2014-01",
        end: "2017-12",
        details: "Grade: 2:1",
        approximateDates: true,
      },
    ]);
  });

  it("returns nothing and says so when there are no headings", () => {
    const empty = parseCvText("Just a name\nand a phone number");
    expect(empty.confidence).toEqual({
      summary: "none",
      experience: "none",
      education: "none",
      techStack: "none",
      impact: "none",
    });
  });
});

describe("parseCvText never invents numbers", () => {
  const parsed = parseCvText(SAMPLE);

  it("keeps only achievement lines that already have a number, word for word", () => {
    expect(parsed.impact).toEqual([
      "Cut late orders by 18% in one quarter",
      "Trained 2 new starters and wrote the guide",
    ]);
    for (const line of parsed.impact) expect(SAMPLE).toContain(line);
  });

  it("never turns a line without a number into an impact item", () => {
    expect(parsed.impact).not.toContain("Led the depot move");
    expect(parsed.skippedImpact).toContain("Led the depot move");
    const none = parseCvText("Achievements\n• Led the depot move\n• Ran the rota");
    expect(none.impact).toEqual([]);
  });

  it("does not turn spelled out numbers or experience bullets into impact", () => {
    const text =
      "Achievements\n- Doubled the team\n- Hired three people\nWork Experience\nLead\nJan 2020 - Now\n- Grew sales 40%";
    expect(parseCvText(text).impact).toEqual([]);
  });

  it("adds no digit that was not in the text fields of the input", () => {
    const inputDigits = new Set(digits(SAMPLE));
    const out = [
      parsed.summary,
      ...parsed.techStack,
      ...parsed.impact,
      ...parsed.experience.flatMap((j) => [j.role, j.employer, j.location, ...j.bullets]),
      ...parsed.education.flatMap((s) => [s.qualification, s.institution, s.details]),
    ];
    for (const text of out) for (const d of digits(text)) expect(inputDigits.has(d)).toBe(true);
  });

  it("does not split a number when a long line is broken to fit", () => {
    const long = `Work Experience\nLead\nJan 2020 - Now\n${"Moved 1200 crates and filed reports. ".repeat(20)}`;
    const job = parseCvText(long).experience[0];
    expect(job).toBeDefined();
    for (const bullet of job?.bullets ?? []) {
      expect(bullet.length).toBeLessThanOrEqual(300);
      expect(digits(bullet).every((d) => d === "1200")).toBe(true);
    }
  });

  it("flags a year with no month as approximate", () => {
    const job = parseCvText("Experience\nAnalyst, Acme\n2019 - 2021").experience[0];
    expect(job?.approximateDates).toBe(true);
  });
});
