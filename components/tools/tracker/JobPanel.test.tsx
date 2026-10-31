import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/storage/db", () => import("@/lib/storage/memoryDb"));

import { resetMemoryDb, seed } from "@/lib/storage/memoryDb";
import { TrackerShell } from "./TrackerShell";
import { seedJobs, storedJob } from "./testkit.test-util";

async function openPanel(title = "Role a") {
  const card = await screen.findByRole("button", { name: title });
  card.focus();
  fireEvent.click(card);
  return screen.findByRole("dialog");
}

beforeEach(() => {
  resetMemoryDb();
  seedJobs([storedJob("a", { url: "https://example.com/ad" })]);
});

describe("job detail panel", () => {
  it("opens as a labelled dialog and closes on Escape with focus back on the card", async () => {
    render(<TrackerShell />);
    const dialog = await openPanel();
    expect(within(dialog).getByRole("heading", { name: "Role a", level: 2 })).toBeTruthy();
    const card = document.querySelector<HTMLElement>('[data-open-job="a"]');
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(card));
  });

  it("edits fields and saves them", async () => {
    render(<TrackerShell />);
    const dialog = await openPanel();
    const title = within(dialog).getByLabelText("Job title");
    fireEvent.change(title, { target: { value: "Senior analyst" } });
    fireEvent.change(within(dialog).getByLabelText("Lowest figure"), {
      target: { value: "40000" },
    });
    fireEvent.change(within(dialog).getByLabelText("Highest figure"), {
      target: { value: "50000" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(within(dialog).getByText("Saved on this device.")).toBeTruthy());
    expect(within(dialog).getByRole("heading", { name: "Senior analyst" })).toBeTruthy();
  });

  it("shows plain errors for a bad figure and a missing date", async () => {
    render(<TrackerShell />);
    const dialog = await openPanel();
    fireEvent.change(within(dialog).getByLabelText("Lowest figure"), { target: { value: "lots" } });
    fireEvent.change(within(dialog).getByLabelText("Next step"), { target: { value: "Call" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));
    expect(within(dialog).getByText(/as a number/)).toBeTruthy();
    expect(within(dialog).getByText("Add a date for the next step.")).toBeTruthy();
  });

  it("changes stage, with a timeline entry and an inline Undo", async () => {
    render(<TrackerShell />);
    const dialog = await openPanel();
    fireEvent.change(within(dialog).getByLabelText("Stage"), {
      target: { value: "stage-applied" },
    });
    expect(within(dialog).getByText("Moved Role a to Applied.")).toBeTruthy();
    expect(within(dialog).getByText("Saved to Applied")).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Undo" }));
    expect((within(dialog).getByLabelText("Stage") as HTMLSelectElement).value).toBe("stage-saved");
  });

  it("adds, edits and deletes timeline entries", async () => {
    render(<TrackerShell />);
    const dialog = await openPanel();
    fireEvent.change(within(dialog).getByLabelText("Add a note to the timeline"), {
      target: { value: "Spoke to Sam" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add note" }));
    expect(within(dialog).getByText("Spoke to Sam")).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: /^Edit note entry/ }));
    fireEvent.change(within(dialog).getByLabelText("Edit note entry"), {
      target: { value: "Spoke to Sam on Monday" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save entry" }));
    expect(within(dialog).getByText("Spoke to Sam on Monday")).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: /^Delete note entry/ }));
    expect(within(dialog).queryByText("Spoke to Sam on Monday")).toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: "Undo" }));
    expect(within(dialog).getByText("Spoke to Sam on Monday")).toBeTruthy();
  });

  it("rejects an empty note", async () => {
    render(<TrackerShell />);
    const dialog = await openPanel();
    fireEvent.click(within(dialog).getByRole("button", { name: "Add note" }));
    expect(within(dialog).getByText(/Enter some text/)).toBeTruthy();
  });

  it("adds an interview with a result and lists it", async () => {
    render(<TrackerShell />);
    const dialog = await openPanel();
    fireEvent.click(within(dialog).getByRole("button", { name: "Add an interview" }));
    fireEvent.change(within(dialog).getByLabelText("Date and time"), {
      target: { value: "2999-05-01T10:30" },
    });
    fireEvent.change(within(dialog).getByLabelText("Result"), { target: { value: "Went well" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save interview" }));
    expect(within(dialog).getByText(/Result: Went well/)).toBeTruthy();
  });

  it("asks for a date when saving an interview without one", async () => {
    render(<TrackerShell />);
    const dialog = await openPanel();
    fireEvent.click(within(dialog).getByRole("button", { name: "Add an interview" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Save interview" }));
    expect(within(dialog).getByText("Enter the date and time of the interview.")).toBeTruthy();
  });

  it("adds and removes tags", async () => {
    render(<TrackerShell />);
    const dialog = await openPanel();
    fireEvent.change(within(dialog).getByLabelText("Add a tag"), { target: { value: "remote" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add tag" }));
    expect(within(dialog).getByText("remote")).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove tag remote" }));
    expect(within(dialog).queryByText("remote")).toBeNull();
  });

  it("links and unlinks a contact", async () => {
    seed("tracker-contacts", "c1", { id: "c1", name: "Sam Carter", role: "Recruiter" });
    render(<TrackerShell />);
    const dialog = await openPanel();
    fireEvent.change(within(dialog).getByLabelText("Link a contact"), { target: { value: "c1" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Link contact" }));
    expect(await within(dialog).findByRole("button", { name: "Unlink Sam Carter" })).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Unlink Sam Carter" }));
    expect(within(dialog).queryByRole("button", { name: "Unlink Sam Carter" })).toBeNull();
  });

  it("archives from the panel, closes it and offers Undo", async () => {
    render(<TrackerShell />);
    const dialog = await openPanel();
    fireEvent.click(within(dialog).getByRole("button", { name: "Archive job" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByText("Archived Role a.")).toBeTruthy();
  });

  it("deletes from the panel and the job can be brought back", async () => {
    render(<TrackerShell />);
    const dialog = await openPanel();
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete job" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(await screen.findByRole("button", { name: "Role a" })).toBeTruthy();
  });
});
