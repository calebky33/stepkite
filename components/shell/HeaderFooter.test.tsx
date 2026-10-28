import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Footer } from "./Footer";
import { Header } from "./Header";

vi.mock("next/navigation", () => ({ usePathname: () => "/uk" }));

describe("Header and Footer", () => {
  it("keeps the header to the logo and the country links so it stays on one row at 375px", () => {
    render(<Header />);
    expect(screen.getByRole("navigation", { name: "Country" })).toBeTruthy();
    expect(screen.queryByRole("radiogroup", { name: "Theme" })).toBeNull();
  });

  it("puts the theme choice in the footer", () => {
    render(<Footer />);
    expect(screen.getByRole("radiogroup", { name: "Theme" })).toBeTruthy();
  });
});
