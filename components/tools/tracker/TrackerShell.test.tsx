import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/storage/db", async () => {
  const memory = await import("@/lib/storage/memoryDb");
  return { ...memory, writeItem: vi.fn(memory.writeItem), removeItem: vi.fn(memory.removeItem) };
});

import * as db from "@/lib/storage/db";
import { control, listIds, resetMemoryDb } from "@/lib/storage/memoryDb";
import { STAGE_PAGE, TrackerShell } from "./TrackerShell";
import { legacyJob, openTab, seedJobs, storedJob, type } from "./testkit.test-util";

async function addJob(title: string, company: string) {
  await screen.findByText(/No jobs saved yet/);
  type("Job title", title);
  type("Company", company);
  fireEvent.click(screen.getByRole("button", { name: "Add job" }));
}

function deleteViaMenu(title: string) {
  fireEvent.click(screen.getByRole("button", { name: `More actions for ${title}` }));
  fireEvent.click(screen.getByRole("button", { name: `Delete ${title}` }));
}

beforeEach(() => {
  resetMemoryDb();
  vi.mocked(db.writeItem).mockClear();
  vi.mocked(db.removeItem).mockClear();
});

describe("TrackerShell load path", () => {
  it("shows the empty state in plain words", async () => {
    render(<TrackerShell />);
    expect(await screen.findByText(/No jobs saved yet/)).toBeTruthy();
  });

  it("shows a loading state first", () => {
    render(<TrackerShell />);
    expect(screen.getByText("Loading your jobs")).toBeTruthy();
  });

  it("renders a column for each default stage record", async () => {
    seedJobs([storedJob("a")]);
    render(<TrackerShell />);
    for (const name of [
      "Saved",
      "Applied",
      "Screening",
      "Interview",
      "Offer",
      "Rejected",
      "Withdrawn",
    ]) {
      expect(await screen.findByRole("region", { name: new RegExp(`^${name}`) })).toBeTruthy();
    }
  });

  it("reads jobs saved in the old shape and counts unreadable rows", async () => {
    seedJobs([legacyJob("a", "offer"), legacyJob("b", "closed")]);
    seedJobs([{ id: "broken", nope: true }]);
    render(<TrackerShell />);
    const offer = await screen.findByRole("region", { name: /^Offer/ });
    expect(within(offer).getByText("Legacy a")).toBeTruthy();
    const rejected = screen.getByRole("region", { name: /^Rejected/ });
    expect(within(rejected).getByText("Legacy b")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("One saved item could not be read");
  });

  it("shows an error state, never an empty list, when storage fails", async () => {
    control.error = true;
    render(<TrackerShell />);
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("Nothing was deleted"),
    );
    expect(screen.queryByText(/No jobs saved yet/)).toBeNull();
    control.error = false;
    seedJobs([storedJob("a")]);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("button", { name: "Role a" })).toBeTruthy();
  });

  it("keeps a copy of unreadable rows in quarantine and leaves the originals", async () => {
    seedJobs([storedJob("a"), { id: "bad", nope: true }]);
    render(<TrackerShell />);
    await screen.findByRole("alert");
    const quarantined = await listIds("tracker-quarantine");
    expect(quarantined.ok && quarantined.value.length).toBe(1);
    const originals = await listIds("jobs");
    expect(originals.ok && originals.value.sort()).toEqual(["a", "bad"]);
  });

  it("explains when storage is unavailable and still lets you add a job", async () => {
    control.unavailable = true;
    render(<TrackerShell />);
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(
        "Saved jobs cannot be read in this browser",
      ),
    );
    expect(screen.getByRole("button", { name: "Add job" })).toBeTruthy();
  });
});

describe("TrackerShell board", () => {
  it("adds a job to Saved, stores it and starts its timeline", async () => {
    render(<TrackerShell />);
    await addJob("Payroll analyst", "Northwind");
    const saved = screen.getByRole("region", { name: /^Saved/ });
    expect(within(saved).getByText("Payroll analyst")).toBeTruthy();
    await waitFor(() => {
      const collections = vi.mocked(db.writeItem).mock.calls.map((c) => c[0]);
      expect(collections).toContain("jobs");
      expect(collections).toContain("tracker-activity");
    });
  });

  it("moves a job on and writes it without the old stage field", async () => {
    render(<TrackerShell />);
    await addJob("Analyst", "Acme");
    fireEvent.click(screen.getByRole("button", { name: "Move Analyst to Applied" }));
    const applied = screen.getByRole("region", { name: /^Applied/ });
    expect(within(applied).getByText("Analyst")).toBeTruthy();
    const job = vi
      .mocked(db.writeItem)
      .mock.calls.filter((c) => c[0] === "jobs")
      .map((c) => c[3] as Record<string, unknown>)
      .at(-1);
    expect(job?.stageId).toBe("stage-applied");
    expect(job && "stage" in job).toBe(false);
  });

  it("asks for a title and company and rejects a bad link", async () => {
    render(<TrackerShell />);
    await screen.findByText(/No jobs saved yet/);
    type(/Link to the job ad/, "not a link");
    fireEvent.click(screen.getByRole("button", { name: "Add job" }));
    expect(screen.getByText("Enter the job title.")).toBeTruthy();
    expect(screen.getByText("Enter the company.")).toBeTruthy();
    expect(screen.getByText(/starts with http or https/)).toBeTruthy();
    expect(db.writeItem).not.toHaveBeenCalled();
  });

  it("deletes from the card menu, then Undo puts it back and stores it again", async () => {
    render(<TrackerShell />);
    await addJob("Analyst", "Acme");
    vi.mocked(db.writeItem).mockClear();
    deleteViaMenu("Analyst");
    expect(screen.queryByRole("button", { name: "More actions for Analyst" })).toBeNull();
    await waitFor(() => expect(db.removeItem).toHaveBeenCalledWith("jobs", expect.any(String)));
    expect(screen.getByText("Deleted Analyst.")).toBeTruthy();
    expect(document.activeElement?.textContent).toBe("Undo");
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    const saved = screen.getByRole("region", { name: /^Saved/ });
    expect(within(saved).getByText("Analyst")).toBeTruthy();
    expect(vi.mocked(db.writeItem).mock.calls.map((c) => c[0])).toContain("jobs");
    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
  });

  it("drops the Undo bar after 10 seconds and the job stays deleted", async () => {
    render(<TrackerShell />);
    await addJob("Analyst", "Acme");
    vi.useFakeTimers();
    try {
      deleteViaMenu("Analyst");
      act(() => {
        vi.advanceTimersByTime(9_000);
      });
      expect(screen.getByRole("button", { name: "Undo" })).toBeTruthy();
      act(() => {
        vi.advanceTimersByTime(1_000);
      });
      expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
      expect(screen.queryByText("Analyst")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("undoes a move and an archive", async () => {
    render(<TrackerShell />);
    await addJob("Analyst", "Acme");
    fireEvent.click(screen.getByRole("button", { name: "Move Analyst to Applied" }));
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(
      within(screen.getByRole("region", { name: /^Saved/ })).getByText("Analyst"),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "More actions for Analyst" }));
    fireEvent.click(screen.getByRole("button", { name: "Archive Analyst" }));
    expect(screen.queryByText("Analyst")).toBeNull();
    expect(screen.getByText("Archived Analyst.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(
      within(screen.getByRole("region", { name: /^Saved/ })).getByText("Analyst"),
    ).toBeTruthy();
  });

  it("moves with the menu and closes it on Escape", async () => {
    render(<TrackerShell />);
    await addJob("Analyst", "Acme");
    const toggle = screen.getByRole("button", { name: "More actions for Analyst" });
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    fireEvent.keyDown(toggle, { key: "Escape" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(toggle);
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole("button", { name: "Move to Offer" }));
    expect(
      within(screen.getByRole("region", { name: /^Offer/ })).getByText("Analyst"),
    ).toBeTruthy();
  });

  it("says when a delete could not be saved", async () => {
    render(<TrackerShell />);
    await addJob("Analyst", "Acme");
    vi.mocked(db.removeItem).mockResolvedValueOnce({ ok: false, reason: "unavailable" });
    deleteViaMenu("Analyst");
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("could not be saved"),
    );
  });

  it("keeps the save error on screen even after a later save succeeds", async () => {
    render(<TrackerShell />);
    await addJob("Analyst", "Acme");
    vi.mocked(db.writeItem).mockResolvedValueOnce({ ok: false, reason: "error", cause: "x" });
    fireEvent.click(screen.getByRole("button", { name: "Move Analyst to Applied" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("was not saved"));
    fireEvent.click(screen.getByRole("button", { name: "Move Analyst to Screening" }));
    await waitFor(() =>
      expect(
        within(screen.getByRole("region", { name: /^Screening/ })).getByText("Analyst"),
      ).toBeTruthy(),
    );
    expect(screen.getByRole("alert").textContent).toContain("was not saved");
  });

  it("sends focus back to the card after Move to in the menu", async () => {
    render(<TrackerShell />);
    await addJob("Analyst", "Acme");
    fireEvent.click(screen.getByRole("button", { name: "More actions for Analyst" }));
    fireEvent.click(screen.getByRole("button", { name: "Move to Offer" }));
    await waitFor(() =>
      expect(
        within(screen.getByRole("region", { name: /^Offer/ })).getByText("Analyst"),
      ).toBeTruthy(),
    );
    await waitFor(() => {
      const el = document.activeElement as HTMLElement | null;
      expect(el?.getAttribute("data-open-job")).toBeTruthy();
      expect(el?.textContent).toBe("Analyst");
    });
  });

  it("says when the device is full", async () => {
    render(<TrackerShell />);
    await screen.findByText(/No jobs saved yet/);
    vi.mocked(db.writeItem).mockResolvedValueOnce({ ok: false, reason: "full" });
    type("Job title", "Analyst");
    type("Company", "Acme");
    fireEvent.click(screen.getByRole("button", { name: "Add job" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("no room left"));
  });

  it("keeps keyboard focus on the moved card", async () => {
    render(<TrackerShell />);
    await addJob("Analyst", "Acme");
    const button = screen.getByRole("button", { name: "Move Analyst to Applied" });
    button.focus();
    fireEvent.click(button);
    await waitFor(() =>
      expect(document.activeElement?.getAttribute("aria-label")).toBe("Move Analyst to Screening"),
    );
  });

  it("draws one page of cards per stage and shows more on request", async () => {
    const total = STAGE_PAGE * 2 + 10;
    seedJobs(Array.from({ length: total }, (_, i) => storedJob(`j${i}`)));
    render(<TrackerShell />);
    const saved = await screen.findByRole("region", { name: /^Saved/ });
    expect(within(saved).getAllByRole("listitem")).toHaveLength(STAGE_PAGE);
    fireEvent.click(within(saved).getByRole("button", { name: `Show ${STAGE_PAGE} more` }));
    expect(within(saved).getAllByRole("listitem")).toHaveLength(STAGE_PAGE * 2);
    fireEvent.click(within(saved).getByRole("button", { name: "Show 10 more" }));
    expect(within(saved).getAllByRole("listitem")).toHaveLength(total);
  }, 20_000);
});

describe("TrackerShell reminders and list", () => {
  it("lists overdue next steps before upcoming ones", async () => {
    seedJobs([
      storedJob("later", {
        title: "Later job",
        nextStep: { text: "Call back", dueAt: "2999-01-01T09:00:00.000Z" },
      }),
      storedJob("late", {
        title: "Late job",
        nextStep: { text: "Send email", dueAt: "2020-01-01T09:00:00.000Z" },
      }),
    ]);
    render(<TrackerShell />);
    const strip = await screen.findByRole("region", { name: "Coming up" });
    const items = within(strip).getAllByRole("listitem");
    expect(items[0]?.textContent).toContain("Late job");
    expect(items[0]?.textContent).toContain("Overdue");
    expect(items[1]?.textContent).toContain("Later job");
  });

  it("shows the list view and sorts by a column", async () => {
    seedJobs([storedJob("a", { title: "Banker" }), storedJob("b", { title: "Analyst" })]);
    render(<TrackerShell />);
    await screen.findByRole("region", { name: /^Saved/ });
    openTab("List");
    const table = await screen.findByRole("table", { name: "All jobs" });
    fireEvent.click(within(table).getByRole("button", { name: "Job title" }));
    const first = within(table).getAllByRole("row")[1];
    expect(first?.textContent).toContain("Analyst");
    expect(
      within(table).getByRole("columnheader", { name: "Job title" }).getAttribute("aria-sort"),
    ).toBe("ascending");
  });
});
