import { describe, expect, it } from "vitest";
import { checkAts, LONG_BULLET_CHARS } from "./ats";
import { exampleCv } from "./example";
import { GENERIC_CV_PHRASES } from "./phrases";
import { getCvRules } from "./rules";
import { emptyCv, type Cv } from "./schema";

const NOW = "2026-01-01T00:00:00.000Z";

function good(country: Cv["country"] = "uk"): Cv {
  const cv = exampleCv(emptyCv("a", country, NOW));
  return { ...cv, contact: { ...cv.contact, phone: "07700 900123" } };
}
const run = (cv: Cv, pageCount: number | null = 1) =>
  checkAts({ cv, rules: getCvRules(cv.country), pageCount });
const ids = (cv: Cv, pageCount: number | null = 1) => run(cv, pageCount).flags.map((f) => f.id);

describe("checkAts", () => {
  it("passes a clean CV and says what passed", () => {
    const report = run(good());
    expect(report.flags).toEqual([]);
    expect(report.passes).toEqual(
      expect.arrayContaining([
        "Name, email and phone are all there.",
        "Dates are written the same way throughout.",
        "No empty sections with headings.",
        "No very long bullets.",
        "No stock phrases found.",
      ]),
    );
  });

  it("flags a missing name, email and phone, each with the field to fix", () => {
    const cv = { ...good(), contact: { ...good().contact, fullName: "", email: " ", phone: "" } };
    const flags = run(cv).flags.filter((f) => f.section === "contact");
    expect(flags.map((f) => f.field)).toEqual(["Full name", "Email", "Phone"]);
  });

  it("flags a photo only where the rules say avoid", () => {
    const uk = checkAts({ cv: good("uk"), rules: getCvRules("uk"), pageCount: 1, hasPhoto: true });
    expect(uk.flags.map((f) => f.id)).toContain("photo");
    const india = checkAts({
      cv: good("in"),
      rules: getCvRules("in"),
      pageCount: 1,
      hasPhoto: true,
    });
    expect(india.flags.map((f) => f.id)).not.toContain("photo");
    expect(run(good("uk")).passes.join(" ")).toContain("No photo");
  });

  it("warns above the rules' page limit and passes at or below it", () => {
    expect(ids(good("uk"), 3)).toContain("pages");
    expect(ids(good("uk"), 2)).not.toContain("pages");
    expect(ids(good("us"), 2)).toContain("pages");
    expect(ids(good("us"), 1)).not.toContain("pages");
    expect(ids(good("uk"), null)).not.toContain("pages");
    expect(run(good("uk"), 2).passes.join(" ")).toContain("2 pages");
  });

  it("flags education dates and certification dates written differently", () => {
    const cv = good();
    const mixed: Cv = {
      ...cv,
      education: [
        ...cv.education,
        {
          id: "e2",
          qualification: "A levels",
          institution: "College",
          start: null,
          end: null,
          details: "",
        },
      ],
      certifications: [
        { id: "c1", name: "First aid", issuer: "", date: "2023-05" },
        { id: "c2", name: "Forklift", issuer: "", date: null },
      ],
    };
    expect(ids(mixed)).toEqual(expect.arrayContaining(["dates-education", "dates-certifications"]));
  });

  it("flags entries that print a heading with nothing under it", () => {
    const cv = good();
    const blank: Cv = {
      ...cv,
      experience: [
        ...cv.experience,
        {
          id: "j9",
          role: "",
          employer: "",
          location: "",
          start: "2020-01",
          end: null,
          bullets: ["", " "],
        },
      ],
      education: [
        { id: "e9", qualification: "", institution: "", start: null, end: null, details: "" },
      ],
      skills: [{ id: "s9", label: "Tools", items: [] }],
    };
    expect(ids(blank)).toEqual(
      expect.arrayContaining(["empty-experience", "empty-education", "empty-skills"]),
    );
  });

  it("flags very long bullets and names where they are", () => {
    const cv = good();
    const long: Cv = {
      ...cv,
      experience: [
        { ...cv.experience[0]!, bullets: ["Short.", "x".repeat(LONG_BULLET_CHARS + 1)] },
      ],
    };
    const flag = run(long).flags.find((f) => f.id.startsWith("long-"));
    expect(flag?.section).toBe("experience");
    expect(flag?.message).toContain("experience entry 1, bullet 2");
    expect(
      ids({
        ...cv,
        experience: [{ ...cv.experience[0]!, bullets: ["x".repeat(LONG_BULLET_CHARS)] }],
      }),
    ).toEqual([]);
  });

  it("flags stock phrases wherever the person wrote them", () => {
    const cv = good();
    const stock: Cv = {
      ...cv,
      summary: "A Results-Driven team player.",
      impact: ["Proven track record of savings, 12 percent"],
    };
    const flags = run(stock).flags;
    expect(flags.map((f) => f.message).join("\n")).toContain('"results-driven" in your summary');
    expect(flags.some((f) => f.section === "impact")).toBe(true);
    expect(flags.some((f) => f.message.includes('"team player"'))).toBe(true);
  });

  it("never blocks: every flag has a message and a section", () => {
    const report = run({ ...emptyCv("z", "uk", NOW) }, 5);
    for (const flag of report.flags) {
      expect(flag.message.length).toBeGreaterThan(10);
      expect(flag.section).toBeTruthy();
    }
  });

  it("keeps user facing text free of dashes, slashes and exclamation marks", () => {
    const cv = good();
    const noisy: Cv = {
      ...cv,
      contact: { ...cv.contact, fullName: "", phone: "" },
      summary: GENERIC_CV_PHRASES.slice(0, 3).join(" "),
    };
    const report = run(noisy, 9);
    const text = [...report.flags.map((f) => f.message + f.field), ...report.passes].join("\n");
    expect(text).not.toMatch(/[–—!/]| - /);
  });
});

describe("generic phrase list", () => {
  it("is lower case, unique and has no spaced dashes", () => {
    expect(new Set(GENERIC_CV_PHRASES).size).toBe(GENERIC_CV_PHRASES.length);
    for (const p of GENERIC_CV_PHRASES) {
      expect(p).toBe(p.toLowerCase());
      expect(p).not.toMatch(/[–—/!]| - /);
    }
  });
});
