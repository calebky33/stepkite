import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Footer } from "./Footer";
import { Header } from "./Header";

let pathname = "/uk";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

beforeEach(() => {
  pathname = "/uk";
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Header", () => {
  it("shows the logo, the main links and the country links", () => {
    render(<Header />);
    expect(screen.getByRole("img", { name: "Stepkite" })).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Main" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /^Country, / }).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Pay calculator" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "CV builder" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Build a CV" })).toBeTruthy();
    expect(screen.queryByRole("radiogroup", { name: "Theme" })).toBeNull();
  });

  it("marks the current section", () => {
    pathname = "/uk/cv";
    render(<Header />);
    expect(screen.getByRole("link", { name: "CV builder" }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(
      screen.getByRole("link", { name: "Pricing and features" }).getAttribute("aria-current"),
    ).toBeNull();
  });

  it("announces a section match as current without claiming it is the page", () => {
    pathname = "/uk/tracker";
    render(<Header />);
    expect(screen.getByRole("button", { name: "Tools" })).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "CV builder" }).getAttribute("aria-current"),
    ).toBeNull();
  });

  it("opens the Tools menu, lists real routes and closes on Escape", () => {
    pathname = "/in";
    render(<Header />);
    const button = screen.getByRole("button", { name: "Tools" });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("link", { name: "Job tracker" })).toBeNull();
    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(
      screen.getByRole("link", { name: "Take-home pay calculator" }).getAttribute("href"),
    ).toBe("/in/salary-calculator");
    expect(
      screen.getAllByRole("link", { name: "CV builder" }).map((a) => a.getAttribute("href")),
    ).toEqual(["/in/cv", "/in/cv"]);
    expect(screen.getByRole("link", { name: "Job tracker" }).getAttribute("href")).toBe(
      "/in/tracker",
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(button);
  });

  it("offers the Tools menu inside the mobile menu", () => {
    render(<Header />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const buttons = screen.getAllByRole("button", { name: "Tools" });
    fireEvent.click(buttons[buttons.length - 1]!);
    expect(screen.getAllByRole("link", { name: "Job tracker" }).length).toBe(1);
  });

  it("keeps the links in the current country", () => {
    pathname = "/in/cv";
    render(<Header />);
    expect(screen.getByRole("link", { name: "Pay calculator" }).getAttribute("href")).toBe(
      "/in/salary-calculator",
    );
    expect(screen.getByRole("link", { name: "Build a CV" }).getAttribute("href")).toBe("/in/cv");
  });

  it("opens and closes the mobile menu with the keyboard", () => {
    render(<Header />);
    const button = screen.getByRole("button", { name: "Open menu" });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(button);
    expect(screen.getByRole("navigation", { name: "Mobile" })).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("navigation", { name: "Mobile" })).toBeNull();
    expect(document.getElementById("site-menu")?.hasAttribute("hidden")).toBe(true);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Open menu" }));
  });

  it("closes the mobile menu when the route changes", () => {
    const { rerender } = render(<Header />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByRole("navigation", { name: "Mobile" })).toBeTruthy();
    pathname = "/uk/cv";
    rerender(<Header />);
    expect(screen.queryByRole("navigation", { name: "Mobile" })).toBeNull();
    expect(document.getElementById("site-menu")?.hasAttribute("hidden")).toBe(true);
  });

  it("closes the mobile menu when the viewport grows past the breakpoint", () => {
    let listener: ((event: MediaQueryListEvent) => void) | undefined;
    vi.stubGlobal("matchMedia", () => ({
      matches: false,
      addEventListener: (_: string, onChange: (event: MediaQueryListEvent) => void) => {
        listener = onChange;
      },
      removeEventListener: () => {},
    }));
    render(<Header />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByRole("navigation", { name: "Mobile" })).toBeTruthy();
    act(() => listener?.({ matches: true } as MediaQueryListEvent));
    expect(screen.queryByRole("navigation", { name: "Mobile" })).toBeNull();
  });
});

describe("Footer", () => {
  it("puts the theme choice and the four link groups in the footer", () => {
    render(<Footer />);
    expect(screen.getByRole("radiogroup", { name: "Theme" })).toBeTruthy();
    for (const name of ["Tools", "Explore", "Company", "Countries", "Legal"]) {
      expect(screen.getByRole("navigation", { name })).toBeTruthy();
    }
    expect(screen.getByRole("heading", { name: "Stepkite" })).toBeTruthy();
  });

  it("links to the real tool routes for the current country", () => {
    pathname = "/in/cv";
    render(<Footer />);
    expect(screen.getByRole("link", { name: "Take-home calculator" }).getAttribute("href")).toBe(
      "/in/salary-calculator",
    );
    expect(screen.getByRole("link", { name: "CV builder" }).getAttribute("href")).toBe("/in/cv");
    expect(screen.getByRole("link", { name: "Offer comparison" }).getAttribute("href")).toBe(
      "/in/compare/offers",
    );
    expect(screen.getByRole("link", { name: "All tools" }).getAttribute("href")).toBe("/in");
  });

  it("shows the country links, legal links and the update signup", () => {
    render(<Footer />);
    expect(screen.getByRole("link", { name: "India" }).getAttribute("href")).toBe("/in");
    expect(screen.getByRole("link", { name: "Privacy policy" }).getAttribute("href")).toBe(
      "/privacy",
    );
    expect(screen.getByRole("link", { name: "Product updates" }).getAttribute("href")).toBe(
      "#product-updates",
    );
    expect(screen.getByRole("heading", { name: "Supported countries" })).toBeTruthy();
    expect(screen.getByText("Career tools, designed around you.")).toBeTruthy();
    expect(screen.getByLabelText("Email address")).toBeTruthy();
    expect(screen.getByText(/not connected yet/i)).toBeTruthy();
  });
});
