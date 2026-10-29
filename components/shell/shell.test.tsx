import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdSlot } from "./AdSlot";
import { ConsentBanner } from "./ConsentBanner";
import { CountrySwitcher } from "./CountrySwitcher";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

/** jsdom drops Secure cookies on http, so keep our own jar. */
let jar = "";
let cookieWrites: string[] = [];
beforeEach(() => {
  jar = "";
  cookieWrites = [];
  Object.defineProperty(document, "cookie", {
    configurable: true,
    get: () => jar,
    set: (value: string) => {
      cookieWrites.push(value);
      const pair = value.split(";")[0] ?? "";
      jar = pair;
    },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function setZone(zone: string) {
  vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
    timeZone: zone,
  } as Intl.ResolvedDateTimeFormatOptions);
}

describe("ConsentBanner", () => {
  it("shows on a UK route, sets no cookie before a choice, and stores a decline", () => {
    pathname = "/uk";
    setZone("America/New_York");
    render(<ConsentBanner />);
    expect(screen.getByRole("region", { name: "Cookie choice" })).toBeTruthy();
    expect(cookieWrites).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Decline" }));
    expect(cookieWrites).toHaveLength(1);
    expect(decodeURIComponent(cookieWrites[0] ?? "")).toContain('"analytics":false');
    expect(screen.queryByRole("region", { name: "Cookie choice" })).toBeNull();
  });

  it("stores an accept, and Accept and Decline share one style", () => {
    pathname = "/";
    setZone("Europe/Dublin");
    render(<ConsentBanner />);
    const accept = screen.getByRole("button", { name: "Accept" });
    const decline = screen.getByRole("button", { name: "Decline" });
    expect(accept.className).toBe(decline.className);
    fireEvent.click(accept);
    expect(decodeURIComponent(cookieWrites[0] ?? "")).toContain('"analytics":true');
  });

  it("stays hidden outside the regions that need it", () => {
    pathname = "/us";
    setZone("America/Chicago");
    render(<ConsentBanner />);
    expect(screen.queryByRole("region", { name: "Cookie choice" })).toBeNull();
  });

  it("stays hidden once a choice is stored", () => {
    pathname = "/uk";
    setZone("Europe/London");
    jar = `sk_consent=${encodeURIComponent('{"analytics":false,"ads":false}')}`;
    render(<ConsentBanner />);
    expect(screen.queryByRole("region", { name: "Cookie choice" })).toBeNull();
  });
});

describe("CountrySwitcher", () => {
  beforeEach(() => window.localStorage.clear());

  it("is one button that opens a list of countries and marks the current one", () => {
    pathname = "/uk/cv";
    render(<CountrySwitcher />);
    const button = screen.getByRole("button", { name: "Country, UK" });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("link", { name: "US" }).getAttribute("href")).toBe("/us/cv");
    expect(screen.getByRole("link", { name: "India" }).getAttribute("href")).toBe("/in/cv");
    expect(screen.getByRole("link", { name: "UK" }).getAttribute("aria-current")).toBe("page");
  });

  it("falls back to the country hub when the page has no twin", () => {
    pathname = "/uk/compare/regime";
    render(<CountrySwitcher />);
    fireEvent.click(screen.getByRole("button", { name: "Country, UK" }));
    expect(screen.getByRole("link", { name: "India" }).getAttribute("href")).toBe(
      "/in/compare/regime",
    );
    expect(screen.getByRole("link", { name: "US" }).getAttribute("href")).toBe("/us");
  });

  it("closes on Escape and returns focus to the button", () => {
    pathname = "/uk";
    render(<CountrySwitcher />);
    const button = screen.getByRole("button", { name: "Country, UK" });
    fireEvent.click(button);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(button);
  });

  it("remembers the choice and uses it outside a country", () => {
    pathname = "/uk";
    const { unmount } = render(<CountrySwitcher />);
    fireEvent.click(screen.getByRole("button", { name: "Country, UK" }));
    fireEvent.click(screen.getByRole("link", { name: "India" }));
    expect(window.localStorage.getItem("sk_country")).toBe("in");
    unmount();
    pathname = "/about";
    render(<CountrySwitcher />);
    expect(screen.getByRole("button", { name: "Country, India" })).toBeTruthy();
  });

  it("ignores a saved value that is not a country", () => {
    window.localStorage.setItem("sk_country", "zz");
    pathname = "/about";
    render(<CountrySwitcher />);
    expect(screen.getByRole("button", { name: "Country, UK" })).toBeTruthy();
  });
});

describe("AdSlot", () => {
  it("reserves a fixed box with the Advertisement label", () => {
    render(<AdSlot placement="calculator" />);
    expect(screen.getByText("Advertisement")).toBeTruthy();
    const box = screen.getByTestId("ad-box");
    expect(box.className).toContain("h-[250px]");
    expect(box.getAttribute("data-ads")).toBe("off");
    expect(box.children).toHaveLength(0);
  });

  it("uses a different fixed height for guides and follows the ads consent", () => {
    jar = `sk_consent=${encodeURIComponent('{"analytics":true,"ads":true}')}`;
    render(<AdSlot placement="guide" />);
    const box = screen.getByTestId("ad-box");
    expect(box.className).toContain("h-[280px]");
    act(() => {});
    expect(box.getAttribute("data-ads")).toBe("allowed");
  });
});

describe("Footer", () => {
  it("holds the newsletter form and the country links", async () => {
    const { Footer } = await import("./Footer");
    render(<Footer />);
    expect(screen.getByLabelText("Email address")).toBeTruthy();
    expect(screen.getByRole("link", { name: "India" }).getAttribute("href")).toBe("/in");
  });
});
