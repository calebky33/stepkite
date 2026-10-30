import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn() }));

vi.mock("@/lib/storage/db", () => ({
  readItem: db.read,
  writeItem: db.write,
  removeItem: vi.fn().mockResolvedValue({ ok: true, value: null }),
  listIds: vi.fn().mockResolvedValue({ ok: true, value: [] }),
  readAll: vi.fn().mockResolvedValue({ ok: true, value: { items: [], skipped: 0 } }),
  clearEverything: vi.fn().mockResolvedValue({ ok: true, value: null }),
}));

/** Writes to the CV collection only. Earlier copies are written to their own collection. */
const cvWrites = () => db.write.mock.calls.filter((call) => call[0] === "cvs");

import { CvBuilderShell } from "./CvBuilderShell";

const status = () => screen.getByRole("status").textContent ?? "";
const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

beforeEach(() => {
  db.read.mockReset().mockResolvedValue({ ok: false, reason: "missing" });
  db.write.mockReset().mockResolvedValue({ ok: true, value: null });
});

describe("CvBuilderShell", () => {
  it("renders the editor with labelled fields and a PDF button", async () => {
    render(<CvBuilderShell country="uk" />);
    await screen.findByLabelText("Full name");
    expect(screen.getByLabelText("Email")).toBeTruthy();
    const download = screen.getByRole("button", { name: "Download PDF" });
    expect(download.getAttribute("aria-disabled")).toBe("true");
    const reason = document.getElementById(download.getAttribute("aria-describedby") ?? "");
    expect(reason?.textContent).toContain("Add your name or a section first");
    expect(screen.getByRole("radio", { name: "Preview" })).toBeTruthy();
  });

  it("uses résumé wording for the US", async () => {
    render(<CvBuilderShell country="us" />);
    expect(await screen.findByLabelText("Name of this résumé")).toBeTruthy();
  });

  it("shows typed text in the preview and saves after the pause", async () => {
    render(<CvBuilderShell country="uk" />);
    await screen.findByLabelText("Full name");
    type("Full name", "Asha Rao");
    expect(screen.getByRole("region", { name: "CV preview" }).textContent).toContain("Asha Rao");
    expect(cvWrites()).toHaveLength(0);
    await waitFor(() => expect(status()).toContain("Saved on this device"), { timeout: 2000 });
    expect(cvWrites()).toHaveLength(1);
  });

  it("says so when the browser cannot store anything", async () => {
    db.read.mockResolvedValue({ ok: false, reason: "unavailable" });
    db.write.mockResolvedValue({ ok: false, reason: "unavailable" });
    render(<CvBuilderShell country="uk" />);
    await screen.findByLabelText("Full name");
    type("Full name", "A");
    await waitFor(() => expect(status()).toContain("Saving is not available in this browser"), {
      timeout: 2000,
    });
    expect((screen.getByLabelText("Full name") as HTMLInputElement).value).toBe("A");
  });

  it("does not overwrite an unreadable saved version until the user starts a new one", async () => {
    db.read.mockResolvedValue({ ok: false, reason: "invalid" });
    render(<CvBuilderShell country="uk" />);
    await screen.findByLabelText("Full name");
    type("Full name", "A");
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(cvWrites()).toHaveLength(0);
    expect(status()).toContain("could not read the saved version");
    fireEvent.click(screen.getByRole("button", { name: "Start a new CV" }));
    type("Full name", "AB");
    await waitFor(() => expect(cvWrites().length).toBeGreaterThan(0), { timeout: 2000 });
  });

  it("flags a missing start month on a job", async () => {
    render(<CvBuilderShell country="uk" />);
    await screen.findByLabelText("Full name");
    fireEvent.click(screen.getByRole("button", { name: "Add a job" }));
    type("Start", "");
    expect(screen.getByRole("alert").textContent).toContain("Choose a start month.");
  });

  it("offers three finished UK templates and saves the chosen one", async () => {
    render(<CvBuilderShell country="uk" />);
    await screen.findByLabelText("Full name");
    expect(screen.queryByText("Placeholder template")).toBeNull();
    const picker = screen.getByRole("group", { name: "Template" });
    expect(within(picker).getAllByRole("radio")).toHaveLength(3);
    fireEvent.click(within(picker).getByRole("radio", { name: /Compact/ }));
    await waitFor(() => expect(cvWrites().length).toBeGreaterThan(0), { timeout: 2000 });
    expect(cvWrites()[0]?.[3].templateId).toBe("compact");
  });

  it("keeps the PDF note plain and offers no ad slot", async () => {
    render(<CvBuilderShell country="uk" />);
    await screen.findByLabelText("Full name");
    expect(screen.getByText(/Add your name or a section first/)).toBeTruthy();
    expect(screen.queryByText("Advertisement")).toBeNull();
  });
});
