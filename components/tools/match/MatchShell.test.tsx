import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock("@/lib/storage/db", () => ({ listIds: db.list }));

import { AD_LIMIT, MatchShell } from "./MatchShell";

beforeEach(() => {
  db.list.mockReset().mockResolvedValue({ ok: true, value: [] });
  vi.spyOn(globalThis, "fetch");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("MatchShell", () => {
  it("says matching is not available and keeps Match disabled", async () => {
    render(<MatchShell country="uk" />);
    expect(screen.getByText("Job ad matching is not available yet.")).toBeTruthy();
    const match = screen.getByRole("button", { name: "Match" }) as HTMLButtonElement;
    expect(match.disabled).toBe(true);
    await screen.findByText(/No CV saved yet/);
  });

  it("shows the empty state with a link to the builder", async () => {
    render(<MatchShell country="us" />);
    const link = await screen.findByRole("link", { name: "Build one first." });
    expect(link.getAttribute("href")).toBe("/us/cv");
  });

  it("shows a loading state first", () => {
    db.list.mockReturnValue(new Promise(() => undefined));
    render(<MatchShell country="uk" />);
    expect(screen.getByText(/Loading your saved CVs/)).toBeTruthy();
  });

  it("explains when saved CVs cannot be read", async () => {
    db.list.mockResolvedValue({ ok: false, reason: "unavailable" });
    render(<MatchShell country="uk" />);
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("cannot be read"));
  });

  it("offers a saved CV to choose", async () => {
    db.list.mockResolvedValue({ ok: true, value: ["a"] });
    render(<MatchShell country="uk" />);
    expect(await screen.findByRole("combobox", { name: "Which CV" })).toBeTruthy();
    expect(screen.queryByText(/No CV saved yet/)).toBeNull();
  });

  it("counts characters, caps the ad, and sends nothing", async () => {
    render(<MatchShell country="uk" />);
    await screen.findByText(/No CV saved yet/);
    const field = screen.getByLabelText("Job ad") as HTMLTextAreaElement;
    expect(field.maxLength).toBe(AD_LIMIT);
    fireEvent.change(field, { target: { value: "Payroll analyst" } });
    expect(screen.getByText(/15 of 6,000 characters/)).toBeTruthy();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("marks the result layout as a placeholder with disabled Accept buttons", async () => {
    render(<MatchShell country="in" />);
    await screen.findByText(/No CV saved yet/);
    expect(screen.getByRole("region", { name: /Result/ })).toBeTruthy();
    expect(screen.getByText("Placeholder")).toBeTruthy();
    const accept = screen.getAllByRole("button", { name: /Accept line/ }) as HTMLButtonElement[];
    expect(accept.length).toBeGreaterThan(0);
    expect(accept.every((b) => b.disabled)).toBe(true);
  });
});
