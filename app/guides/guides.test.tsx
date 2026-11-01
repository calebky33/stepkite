import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import GuidePage from "./[slug]/page";
import GuidesIndex from "./page";

describe("guides", () => {
  it("lists all three starter guides", async () => {
    render(await GuidesIndex());
    for (const name of [
      "How to understand your UK payslip",
      "How US federal tax brackets work",
      "Writing a CV that passes ATS checks",
    ]) {
      expect(screen.getByRole("link", { name })).toBeTruthy();
    }
  });

  it("renders one guide with a single H1 and Article data", async () => {
    const { container } = render(
      await GuidePage({ params: Promise.resolve({ slug: "how-to-understand-your-uk-payslip" }) }),
    );
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(container.querySelector("script")?.textContent).toContain('"Article"');
    expect(container.querySelector('a[href="https://www.gov.uk/tax-codes"]')).toBeTruthy();
  });
});
