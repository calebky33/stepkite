import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn() }));

vi.mock("@/lib/storage/db", () => ({ readItem: db.read, writeItem: db.write }));

import { CvBuilderShell } from "./CvBuilderShell";

const status = () => screen.getByRole("status").textContent ?? "";
const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

beforeEach(() => {
  db.read.mockReset().mockResolvedValue({ ok: false, reason: "missing" });
  db.write.mockReset().mockResolvedValue({ ok: true, value: null });
});

describe("CvBuilderShell", () => {
  it("renders the editor with labelled fields and a disabled download", async () => {
    render(<CvBuilderShell country="uk" />);
    await screen.findByLabelText("Full name");
    expect(screen.getByLabelText("Email")).toBeTruthy();
    const download = screen.getByRole("button", { name: "Download CV" }) as HTMLButtonElement;
    expect(download.disabled).toBe(true);
    const reason = document.getElementById(download.getAttribute("aria-describedby") ?? "");
    expect(reason?.textContent).toBe("PDF download is not connected yet.");
    expect(screen.getByRole("radio", { name: "Preview" })).toBeTruthy();
  });

  it("uses résumé wording for the US", async () => {
    render(<CvBuilderShell country="us" />);
    expect(await screen.findByRole("button", { name: "Download résumé" })).toBeTruthy();
  });

  it("shows typed text in the preview and saves after the pause", async () => {
    render(<CvBuilderShell country="uk" />);
    await screen.findByLabelText("Full name");
    type("Full name", "Asha Rao");
    expect(screen.getByRole("region", { name: "CV preview" }).textContent).toContain("Asha Rao");
    expect(db.write).not.toHaveBeenCalled();
    await waitFor(() => expect(status()).toContain("Saved on this device"), { timeout: 2000 });
    expect(db.write).toHaveBeenCalledTimes(1);
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
    expect(db.write).not.toHaveBeenCalled();
    expect(status()).toContain("could not read the saved version");
    fireEvent.click(screen.getByRole("button", { name: "Start a new CV" }));
    type("Full name", "AB");
    await waitFor(() => expect(db.write).toHaveBeenCalled(), { timeout: 2000 });
  });

  it("flags a missing start month on a job", async () => {
    render(<CvBuilderShell country="uk" />);
    await screen.findByLabelText("Full name");
    fireEvent.click(screen.getByRole("button", { name: "Add a job" }));
    type("Start", "");
    expect(screen.getByRole("alert").textContent).toContain("Choose a start month.");
  });

  it("marks each template as a placeholder and saves the chosen one", async () => {
    render(<CvBuilderShell country="uk" />);
    await screen.findByLabelText("Full name");
    expect(screen.getAllByText("Placeholder template")).toHaveLength(3);
    fireEvent.click(screen.getByRole("radio", { name: /Compact/ }));
    await waitFor(() => expect(db.write).toHaveBeenCalled(), { timeout: 2000 });
    expect(db.write.mock.calls[0]?.[3].templateId).toBe("compact");
  });

  it("keeps the PDF message plain and offers no ad slot", async () => {
    render(<CvBuilderShell country="uk" />);
    await screen.findByLabelText("Full name");
    expect(screen.getByText("PDF download is not connected yet.")).toBeTruthy();
    expect(screen.queryByText("Advertisement")).toBeNull();
  });
});
