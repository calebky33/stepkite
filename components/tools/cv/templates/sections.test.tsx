import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { exampleCv } from "@/lib/cv/example";
import { buildBlocks } from "@/lib/cv/paginate";
import { emptyCv, type Cv } from "@/lib/cv/schema";
import { resolveTemplate, templatesFor } from ".";

const NOW = "2026-01-01T00:00:00.000Z";
const COUNTRIES = ["uk", "us", "in"] as const;

function filled(country: (typeof COUNTRIES)[number]): Cv {
  return {
    ...exampleCv(emptyCv("x", country, NOW)),
    certifications: [{ id: "c1", name: "First Aid at Work", issuer: "St John", date: "2023-05" }],
    interests: "Fell running and chess",
    references: [
      { id: "r1", name: "Priya Nair", role: "Manager, Harbour Goods", contact: "p@example.com" },
    ],
  };
}

const ALL = COUNTRIES.flatMap((country) =>
  templatesFor(country).map((t) => [country, t.id, t] as const),
);

describe("certifications, interests and references", () => {
  it("covers nine templates", () => {
    expect(ALL).toHaveLength(9);
  });

  it.each(ALL)("%s %s shows them with headings when filled", (country, _id, t) => {
    const cv = filled(country);
    const { container } = render(<t.Component cv={cv} blocks={buildBlocks(cv)} locale="en-GB" />);
    const text = container.textContent ?? "";
    expect(text).toContain("Certifications");
    expect(text).toContain("First Aid at Work, St John, May 2023");
    expect(text).toContain("Interests");
    expect(text).toContain("Fell running and chess");
    expect(text).toContain("References");
    expect(text).toContain("Priya Nair, Manager, Harbour Goods, p@example.com");
  });

  it.each(ALL)("%s %s leaves them out when empty", (country, _id, t) => {
    const cv = exampleCv(emptyCv("x", country, NOW));
    const { container } = render(<t.Component cv={cv} blocks={buildBlocks(cv)} locale="en-GB" />);
    const text = container.textContent ?? "";
    for (const word of ["Certifications", "Interests", "References"]) {
      expect(text).not.toContain(word);
    }
  });

  it("skips a certification or reference with no name", () => {
    const cv: Cv = {
      ...filled("uk"),
      certifications: [{ id: "c", name: " ", issuer: "X", date: null }],
      references: [{ id: "r", name: "", role: "Y", contact: "" }],
      interests: "  ",
    };
    const kinds = buildBlocks(cv).map((b) => b.kind);
    expect(kinds).not.toContain("certifications");
    expect(kinds).not.toContain("references");
    expect(kinds).not.toContain("interests");
  });

  it("follows the section order", () => {
    const cv: Cv = { ...filled("uk"), sectionOrder: ["references", "interests", "summary"] };
    const kinds = buildBlocks(cv).map((b) => b.kind);
    expect(kinds.indexOf("references")).toBeLessThan(kinds.indexOf("interests"));
    expect(kinds.indexOf("interests")).toBeLessThan(kinds.indexOf("summary"));
  });
});

describe("section semantics and type", () => {
  it("names each section by its visible heading and floors the body size", () => {
    const cv = exampleCv(emptyCv("x", "uk", "2026-01-01T00:00:00.000Z"));
    const t = resolveTemplate("uk", "compact");
    const { container } = render(
      <t.Component
        cv={{ ...cv, style: { ...cv.style, fontScale: 0.9 }, summary: "नमस्ते" }}
        blocks={buildBlocks(cv)}
        locale="en-GB"
      />,
    );
    const sections = [...container.querySelectorAll("section[aria-labelledby]")];
    expect(sections.length).toBeGreaterThan(0);
    for (const section of sections) {
      const id = section.getAttribute("aria-labelledby") ?? "";
      expect(container.querySelector(`[id="${id}"]`)?.tagName).toBe("H3");
    }
    expect(container.querySelector("section[aria-label]")).toBeNull();
    const root = container.firstElementChild as HTMLElement;
    expect(parseFloat(root.style.fontSize)).toBeGreaterThanOrEqual(40 / 3 - 0.001);
    expect(root.style.lineHeight).toBe("1.5");
  });
});
