import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { exampleCv } from "@/lib/cv/example";
import { buildBlocks, paginate } from "@/lib/cv/paginate";
import { emptyCv, type Cv } from "@/lib/cv/schema";
import { PagedPreview } from "../../PagedPreview";
import { TemplatePicker } from "../../TemplatePicker";
import { resolveTemplate, templatesFor } from "..";
import { UK_TEMPLATES } from ".";

const NOW = "2026-01-01T00:00:00.000Z";
const HEADINGS = ["Personal statement", "Work experience", "Education", "Skills"];

function fullCv(): Cv {
  const cv = exampleCv(emptyCv("x", "uk", NOW));
  return { ...cv, impact: ["Cut late orders by a third."] };
}

function worstCase(): Cv {
  const cv = emptyCv("w", "uk", NOW);
  return {
    ...cv,
    contact: {
      ...cv.contact,
      fullName: "Wolfeschlegelsteinhausenbergerdorff".repeat(3),
      email: "a".repeat(80) + "@example.com",
    },
    summary: "मैं एक अनुभवी समन्वयक हूँ। 你好世界 ".repeat(10),
    experience: Array.from({ length: 4 }, (_, j) => ({
      id: `job-${j}`,
      role: `भूमिका ${j}`,
      employer: "雇主".repeat(20),
      location: "",
      start: "2020-01",
      end: j === 0 ? null : "2020-12",
      bullets: Array.from({ length: 10 }, (_b, i) => `Bullet ${j}-${i} ${"word ".repeat(30)}`),
    })),
    education: [
      {
        id: "e1",
        qualification: "BA",
        institution: "X".repeat(100),
        start: null,
        end: "2019-06",
        details: "",
      },
    ],
    skills: [
      { id: "s1", label: "Skills", items: Array.from({ length: 40 }, (_, i) => `Skill${i}`) },
    ],
  };
}

describe("UK templates", () => {
  it("registers three templates for the UK with no placeholder flag", () => {
    expect(templatesFor("uk").map((t) => t.id)).toEqual(["classic", "modern", "compact"]);
    expect(UK_TEMPLATES.every((t) => !t.placeholder)).toBe(true);
    expect(resolveTemplate("uk", "plain").id).toBe("classic");
  });

  it.each(UK_TEMPLATES.map((t) => [t.id, t] as const))(
    "%s renders every heading and the user's text as real text",
    (_id, t) => {
      const cv = fullCv();
      const { container } = render(<t.Component cv={cv} blocks={buildBlocks(cv)} locale="en-GB" />);
      const text = container.textContent ?? "";
      for (const h of HEADINGS) expect(text).toContain(h);
      expect(text).toContain("Sam Example");
      expect(text).toContain("Mar 2021 to present");
      expect(text).toContain("Operations coordinator, Northfield Supplies");
      expect(text).toContain("Scheduling, Supplier contact");
      expect(container.querySelector("img, table, svg, canvas")).toBeNull();
      expect(container.querySelectorAll("[data-block]").length).toBeGreaterThan(0);
    },
  );

  it.each(UK_TEMPLATES.map((t) => [t.id, t] as const))(
    "%s survives worst case data and shows no photo, birth date or nationality",
    (_id, t) => {
      const base = worstCase();
      const cv = {
        ...base,
        contact: { ...base.contact, dateOfBirth: "1990-01-01", nationality: "Testland" },
      };
      const { container } = render(<t.Component cv={cv} blocks={buildBlocks(cv)} locale="en-GB" />);
      const text = container.textContent ?? "";
      expect(text).toContain("你好世界");
      expect(text).toContain("भूमिका 3");
      expect(text).toContain("Skill39");
      expect(text).toContain("Bullet 3-9");
      expect(text).toContain("Wolfeschlegelsteinhausenbergerdorff");
      expect(text).not.toContain("1990");
      expect(text).not.toContain("Testland");
      expect(container.querySelector("img")).toBeNull();
    },
  );

  it("keeps every word when the template changes", () => {
    const cv = fullCv();
    const extract = (id: string) => {
      const t = resolveTemplate("uk", id);
      const { container, unmount } = render(
        <t.Component cv={cv} blocks={buildBlocks(cv)} locale="en-GB" />,
      );
      container.querySelectorAll("h2, h3").forEach((h) => h.remove());
      const out = (container.textContent ?? "").replace(/\s+/g, " ").trim();
      unmount();
      return out;
    };
    const base = extract("classic");
    expect(base).toContain("Harbour Goods");
    for (const id of ["modern", "compact"]) expect(extract(id)).toBe(base);
  });

  it("separates contact details so email and phone never join", () => {
    const cv = fullCv();
    const t = resolveTemplate("uk", "classic");
    const { container } = render(<t.Component cv={cv} blocks={buildBlocks(cv)} locale="en-GB" />);
    const text = container.textContent ?? "";
    expect(text).toContain(cv.contact.email + " |");
  });

  it("lists the three templates in the picker and reports a change", () => {
    const picked: string[] = [];
    render(<TemplatePicker country="uk" value="classic" onChange={(id) => picked.push(id)} />);
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    fireEvent.click(screen.getByRole("radio", { name: /Modern/ }));
    expect(picked).toEqual(["modern"]);
  });

  it("labels the example in the preview", () => {
    render(<PagedPreview cv={emptyCv("x", "uk", NOW)} country="uk" />);
    expect(screen.getByText(/^Example\./)).toBeTruthy();
  });

  it("splits a two page CV only at entry boundaries", () => {
    const cv = worstCase();
    const blocks = buildBlocks(cv);
    const pages = paginate(blocks, () => 400, 1000);
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.flatMap((p) => p.blocks.map((b) => b.key))).toEqual(blocks.map((b) => b.key));
    pages.forEach((p) => {
      if (p.blocks.length > 1) expect(p.usedPx).toBeLessThanOrEqual(1000);
    });
    const jobKeys = blocks.filter((b) => b.kind === "experience").map((b) => b.key);
    jobKeys.forEach((k) =>
      expect(pages.filter((p) => p.blocks.some((b) => b.key === k))).toHaveLength(1),
    );
  });
});
