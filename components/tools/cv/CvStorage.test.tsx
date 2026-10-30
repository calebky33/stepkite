import { withoutNewSections } from "@/lib/cv/testing";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/storage/db", () => import("@/lib/storage/memoryDb"));

import { buildBackup } from "@/lib/cv/backup";
import { emptyCv, storedCvSchema, type Cv } from "@/lib/cv/schema";
import { listCvs, saveCv } from "@/lib/storage/cvStore";
import { readItem } from "@/lib/storage/db";
import { control, resetMemoryDb } from "@/lib/storage/memoryDb";
import { CvBuilderShell } from "./CvBuilderShell";

const NOW = "2026-03-01T10:00:00.000Z";
const make = (id: string, title: string, country: Cv["country"] = "uk"): Cv => ({
  ...emptyCv(id, country, NOW),
  title,
});
const stored = async (id: string) => {
  const r = await readItem("cvs", id, storedCvSchema);
  return r.ok ? r.value : null;
};
const status = () => screen.getByRole("status").textContent ?? "";
const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

beforeEach(() => resetMemoryDb());
afterEach(() => vi.useRealTimers());

describe("autosave", () => {
  it("waits 500 ms, then saves and says so", async () => {
    render(<CvBuilderShell country="uk" />);
    await screen.findByLabelText("Full name");
    vi.useFakeTimers();
    type("Full name", "Asha Rao");
    await act(() => vi.advanceTimersByTimeAsync(499));
    expect(await stored("default")).toBeNull();
    expect(status()).toContain("Saving");
    await act(() => vi.advanceTimersByTimeAsync(2));
    expect((await stored("default"))?.contact.fullName).toBe("Asha Rao");
    expect(status()).toContain("Saved on this device");
    expect(screen.getByText("Your CV stays on this device.")).toBeTruthy();
  });

  it("saves the first template of the country, not a placeholder id", async () => {
    render(<CvBuilderShell country="us" />);
    await screen.findByLabelText("Full name");
    type("Full name", "A");
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    await waitFor(async () => expect((await stored("default"))?.templateId).toBe("classic"));
  });

  it("Ctrl+S and Cmd+S save now and stop the browser's save dialog", async () => {
    render(<CvBuilderShell country="uk" />);
    await screen.findByLabelText("Full name");
    type("Full name", "Now");
    const event = new KeyboardEvent("keydown", { key: "s", metaKey: true, cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    await waitFor(async () => expect((await stored("default"))?.contact.fullName).toBe("Now"));
  });

  it("ignores a plain letter key", async () => {
    render(<CvBuilderShell country="uk" />);
    await screen.findByLabelText("Full name");
    const event = new KeyboardEvent("keydown", { key: "s", cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it("flushes on pagehide and when the tab is hidden", async () => {
    render(<CvBuilderShell country="uk" />);
    await screen.findByLabelText("Full name");
    type("Full name", "Hidden");
    window.dispatchEvent(new Event("pagehide"));
    await waitFor(async () => expect((await stored("default"))?.contact.fullName).toBe("Hidden"));
    type("Full name", "Hidden twice");
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    await waitFor(async () =>
      expect((await stored("default"))?.contact.fullName).toBe("Hidden twice"),
    );
  });

  it("flushes when the screen is left", async () => {
    const { unmount } = render(<CvBuilderShell country="uk" />);
    await screen.findByLabelText("Full name");
    type("Full name", "Left");
    unmount();
    await waitFor(async () => expect((await stored("default"))?.contact.fullName).toBe("Left"));
  });

  it("says so when storage is blocked and keeps what was typed", async () => {
    control.unavailable = true;
    render(<CvBuilderShell country="uk" />);
    await screen.findByLabelText("Full name");
    type("Full name", "A");
    fireEvent.click(screen.getByRole("button", { name: "Save now" }));
    await waitFor(() => expect(status()).toContain("Saving is not available"));
    expect((screen.getByLabelText("Full name") as HTMLInputElement).value).toBe("A");
  });
});

describe("undo and redo", () => {
  it("steps back and forward with buttons and keys", async () => {
    render(<CvBuilderShell country="uk" />);
    await screen.findByLabelText("Full name");
    const undo = screen.getByRole("button", { name: "Undo" }) as HTMLButtonElement;
    const redo = screen.getByRole("button", { name: "Redo" }) as HTMLButtonElement;
    expect(undo.disabled).toBe(true);
    type("Full name", "Asha");
    expect(undo.disabled).toBe(false);
    fireEvent.click(undo);
    expect((screen.getByLabelText("Full name") as HTMLInputElement).value).toBe("");
    expect(redo.disabled).toBe(false);
    fireEvent.keyDown(window, { key: "z", ctrlKey: true, shiftKey: true });
    expect((screen.getByLabelText("Full name") as HTMLInputElement).value).toBe("Asha");
    fireEvent.keyDown(window, { key: "z", metaKey: true });
    expect((screen.getByLabelText("Full name") as HTMLInputElement).value).toBe("");
  });
});

describe("old saves and new sections", () => {
  it("opens a version 1 save and shows the new section fields", async () => {
    const old = withoutNewSections(make("default", "Old"));
    const { seed } = await import("@/lib/storage/memoryDb");
    seed("cvs", "default", { ...old, schemaVersion: 1, sectionOrder: ["summary"] });
    render(<CvBuilderShell country="uk" />);
    await screen.findByLabelText("Full name");
    expect(screen.getByRole("heading", { name: "Certifications" })).toBeTruthy();
    expect(screen.getByLabelText("Interests outside work")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add a reference" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Move Interests up" })).toBeTruthy();
  });

  it("moves a section with the buttons", async () => {
    render(<CvBuilderShell country="uk" />);
    await screen.findByLabelText("Full name");
    fireEvent.click(screen.getByRole("button", { name: "Move Skills up" }));
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    await waitFor(async () => {
      const order = (await stored("default"))?.sectionOrder ?? [];
      expect(order.indexOf("skills")).toBeLessThan(order.indexOf("education"));
    });
  });
});

describe("list screen", () => {
  const open = async () => {
    render(<CvBuilderShell country="uk" />);
    await screen.findByLabelText("Full name");
    fireEvent.click(screen.getByRole("button", { name: "My CVs" }));
    await screen.findByRole("heading", { name: "Your saved CVs" });
  };

  it("shows a plain empty state", async () => {
    await open();
    expect(screen.getByText(/No saved CVs yet/)).toBeTruthy();
    expect(screen.getByText("Nothing deleted. A deleted CV stays here for 30 days.")).toBeTruthy();
  });

  it("duplicates, renames and deletes with a confirm, then restores", async () => {
    await saveCv(make("a", "Graduate UK"));
    await open();
    fireEvent.click(await screen.findByRole("button", { name: "Duplicate Graduate UK" }));
    await screen.findByText("Copy of Graduate UK");

    fireEvent.click(screen.getByRole("button", { name: "Rename Graduate UK" }));
    const rename = await screen.findByRole("dialog", { name: "Rename this CV" });
    fireEvent.change(within(rename).getByLabelText("CV name"), { target: { value: "Data role" } });
    fireEvent.click(within(rename).getByRole("button", { name: "Save name" }));
    await screen.findByRole("button", { name: "Open Data role" });

    fireEvent.click(screen.getByRole("button", { name: "Delete Data role" }));
    const confirm = await screen.findByRole("dialog", { name: "Delete this CV?" });
    expect(await stored("a")).not.toBeNull();
    fireEvent.click(within(confirm).getByRole("button", { name: "Delete" }));
    await screen.findByRole("button", { name: "Restore Data role" });
    expect(await stored("a")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Restore Data role" }));
    await screen.findByRole("button", { name: "Open Data role" });
    expect(await stored("a")).not.toBeNull();
  });

  it("refuses a bad backup file and changes nothing", async () => {
    await saveCv(make("a", "Keep"));
    await open();
    const input = screen.getByLabelText("Choose a backup file");
    const file = new File(["{not json"], "backup.json", { type: "application/json" });
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });
    expect((await screen.findByRole("alert")).textContent).toContain("could not read that file");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(await stored("a")).not.toBeNull();
  });

  it("asks before replacing, then imports", async () => {
    await saveCv(make("a", "Keep"));
    await open();
    const text = buildBackup([make("b", "From file")], new Date(NOW));
    const file = new File([text], "backup.json", { type: "application/json" });
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Choose a backup file"), {
        target: { files: [file] },
      });
    });
    const dialog = await screen.findByRole("dialog", { name: "Replace the CVs on this device?" });
    expect(await stored("b")).toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: "Replace" }));
    await screen.findByRole("button", { name: "Open From file" });
    const all = await listCvs();
    expect(all.ok && all.value.cvs.map((c) => c.id)).toEqual(["b"]);
  });

  it("deletes everything only after a confirm", async () => {
    await saveCv(make("a", "Gone"));
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Delete my data" }));
    const dialog = await screen.findByRole("dialog", { name: "Delete all your data?" });
    expect(await stored("a")).not.toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(await stored("a")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Delete my data" }));
    fireEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Delete everything" }),
    );
    await screen.findByText("Everything was erased from this device.");
    expect(await stored("a")).toBeNull();
  });

  it("explains blocked storage", async () => {
    await open();
    control.unavailable = true;
    fireEvent.click(screen.getByRole("button", { name: "Start a new CV" }));
    await screen.findByLabelText("Full name");
    fireEvent.click(screen.getByRole("button", { name: "My CVs" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Saving is not available");
  });
});
