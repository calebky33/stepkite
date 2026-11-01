import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SandboxBanner } from "./SandboxBanner";

describe("SandboxBanner", () => {
  it("renders the sign-up copy with an aria-live region", () => {
    render(<SandboxBanner country="uk" />);
    const region = screen.getByRole("region", { name: "Sign up to save your draft" });
    expect(region.getAttribute("aria-live")).toBe("polite");
    expect(
      screen.getByText("Sign up to save and export your CV. Your draft moves to your account."),
    ).toBeTruthy();
  });

  it("links to the sign-up page with the country return path", () => {
    render(<SandboxBanner country="in" />);
    const link = screen.getByRole("link", { name: "Sign up" }) as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/sign-up?next=/in/cv");
  });

  it("uses the country return path for each market", () => {
    const { rerender } = render(<SandboxBanner country="uk" />);
    expect(
      (screen.getByRole("link", { name: "Sign up" }) as HTMLAnchorElement).getAttribute("href"),
    ).toBe("/sign-up?next=/uk/cv");
    rerender(<SandboxBanner country="us" />);
    expect(
      (screen.getByRole("link", { name: "Sign up" }) as HTMLAnchorElement).getAttribute("href"),
    ).toBe("/sign-up?next=/us/cv");
  });
});
