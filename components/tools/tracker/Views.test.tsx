import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/storage/db", () => import("@/lib/storage/memoryDb"));

import { control, listIds, readAll, resetMemoryDb, seed } from "@/lib/storage/memoryDb";
import { buildTrackerBackup } from "@/lib/tracker/backup";
import { interviewSchema, type Job } from "@/lib/tracker/schema";
import { TrackerShell } from "./TrackerShell";
import { openTab, seedJobs, storedJob, type } from "./testkit.test-util";

beforeEach(() => resetMemoryDb());
afterEach(() => vi.unstubAllGlobals());

async function ready() {
  await screen.findByRole("button", { name: "Add job" });
  await waitFor(() => expect(screen.queryByText("Loading your jobs")).toBeNull());
}

function pickFile(label: string, name: string, text: string) {
  const file = new File([text], name, { type: "text/plain" });
  fireEvent.change(screen.getByLabelText(label), { target: { files: [file] } });
}

describe("Interviews tab", () => {
  it("asks for a job first when there are none", async () => {
    render(<TrackerShell />);
    await ready();
    openTab("Interviews");
    expect(screen.getByText(/Add a job first/)).toBeTruthy();
  });

  it("adds an interview, lists upcoming first and stores it", async () => {
    seedJobs([storedJob("a")]);
    seed("tracker-interviews", "old", {
      id: "old",
      jobId: "a",
      at: "2020-01-01T10:00:00.000Z",
      kind: "phone",
    });
    render(<TrackerShell />);
    await ready();
    openTab("Interviews");
    fireEvent.click(screen.getByRole("button", { name: "Add an interview" }));
    fireEvent.click(screen.getByRole("button", { name: "Save interview" }));
    expect(screen.getByText("Choose the job this interview is for.")).toBeTruthy();
    type("Job", "a");
    type("Date and time", "2999-05-01T10:30");
    fireEvent.click(screen.getByRole("button", { name: "Save interview" }));
    const upcoming = await screen.findByRole("region", { name: "Upcoming" });
    expect(within(upcoming).getAllByRole("listitem")).toHaveLength(1);
    expect(
      within(screen.getByRole("region", { name: "Past" })).getAllByRole("listitem"),
    ).toHaveLength(1);
    await waitFor(async () => {
      const stored = await readAll("tracker-interviews", interviewSchema);
      expect(stored.ok && stored.value.items.length).toBe(2);
    });
  });
});

describe("Contacts tab", () => {
  it("shows an empty state, then adds, links and deletes a contact", async () => {
    seedJobs([storedJob("a")]);
    render(<TrackerShell />);
    await ready();
    openTab("Contacts");
    expect(screen.getByText(/No contacts yet/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Add a contact" }));
    fireEvent.click(screen.getByRole("button", { name: "Save contact" }));
    expect(screen.getByText("Enter a name.")).toBeTruthy();
    type("Name", "Sam Carter");
    type("Email", "not an email");
    fireEvent.click(screen.getByRole("button", { name: "Save contact" }));
    expect(screen.getByText(/name@example.com/)).toBeTruthy();
    type("Email", "sam@example.com");
    fireEvent.click(screen.getByRole("button", { name: "Save contact" }));
    expect(await screen.findByText("Sam Carter")).toBeTruthy();
    type("Link Sam Carter to a job", "a");
    fireEvent.click(screen.getByRole("button", { name: "Link job" }));
    expect(
      await screen.findByRole("button", { name: "Unlink Sam Carter from Role a" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Delete Sam Carter" }));
    expect(screen.queryByText("Sam Carter")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(
      await screen.findByRole("button", { name: "Unlink Sam Carter from Role a" }),
    ).toBeTruthy();
  });
});

describe("Metrics tab", () => {
  it("shows Not enough data yet instead of inventing numbers", async () => {
    seedJobs([storedJob("a")]);
    render(<TrackerShell />);
    await ready();
    openTab("Metrics");
    expect(screen.getAllByText("Not enough data yet").length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText("Offers").parentElement?.parentElement?.textContent).toContain("0");
  });

  it("works out rates from applied jobs", async () => {
    const recent = new Date().toISOString();
    seedJobs([
      storedJob("a", { stageId: "stage-interview", appliedAt: recent }),
      storedJob("b", { stageId: "stage-applied", appliedAt: recent }),
    ]);
    render(<TrackerShell />);
    await ready();
    openTab("Metrics");
    expect(screen.getAllByText("50%").length).toBe(2);
    expect(screen.getByText("0.5 a week")).toBeTruthy();
  });
});

describe("Settings tab", () => {
  it("renames and reorders stages, and refuses to delete a stage that holds jobs", async () => {
    seedJobs([storedJob("a", { stageId: "stage-applied" })]);
    render(<TrackerShell />);
    await ready();
    openTab("Settings");
    type("Name of Screening", "Phone screen");
    fireEvent.blur(screen.getByLabelText("Name of Screening"));
    fireEvent.click(screen.getByRole("button", { name: "Move Phone screen up" }));
    const names = screen.getAllByLabelText(/^Name of /).map((el) => (el as HTMLInputElement).value);
    expect(names.slice(0, 3)).toEqual(["Saved", "Phone screen", "Applied"]);
    fireEvent.click(screen.getByRole("button", { name: "Delete Applied" }));
    expect(screen.getByRole("alert").textContent).toContain("One job is in Applied");
    fireEvent.click(screen.getByRole("button", { name: "Delete Saved" }));
    expect(screen.getByRole("alert").textContent).toContain("Keep at least one Saved stage");
    fireEvent.click(screen.getByRole("button", { name: "Delete Withdrawn" }));
    expect(screen.queryByLabelText("Name of Withdrawn")).toBeNull();
    await waitFor(async () => {
      const ids = await listIds("tracker-stages");
      expect(ids.ok && ids.value.length).toBe(6);
    });
  });

  it("rejects an empty stage name in plain words", async () => {
    render(<TrackerShell />);
    await ready();
    openTab("Settings");
    type("Name of Offer", "  ");
    fireEvent.blur(screen.getByLabelText("Name of Offer"));
    expect(screen.getByText(/1 to 40 characters/)).toBeTruthy();
  });

  it("exports a CSV and a JSON backup to the device", async () => {
    seedJobs([storedJob("a")]);
    const made: Blob[] = [];
    vi.stubGlobal("URL", {
      createObjectURL: (blob: Blob) => (made.push(blob), "blob:test"),
      revokeObjectURL: () => undefined,
    });
    render(<TrackerShell />);
    await ready();
    openTab("Settings");
    fireEvent.click(screen.getByRole("button", { name: /Export jobs/ }));
    fireEvent.click(screen.getByRole("button", { name: /Export backup/ }));
    expect(made).toHaveLength(2);
    expect(await made[0]?.text()).toContain("title,company");
    expect(await made[1]?.text()).toContain("stepkite-tracker-backup");
  });

  it("imports a CSV with a column mapping step and a preview", async () => {
    render(<TrackerShell />);
    await ready();
    openTab("Settings");
    pickFile(
      "CSV file",
      "jobs.csv",
      "Position,Employer,Stage\nAnalyst,Acme,Applied\nDesigner,,Saved\n",
    );
    expect(await screen.findByText("Match your columns")).toBeTruthy();
    type("Column for Title", "0");
    type("Column for Company", "1");
    type("Column for Stage", "2");
    expect(screen.getByText(/1 of 2 rows are ready to import, 1 skipped./)).toBeTruthy();
    expect(screen.getByText("Check Company in row 2.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Import 1 job" }));
    openTab("Board");
    const applied = await screen.findByRole("region", { name: /^Applied/ });
    expect(within(applied).getByText("Analyst")).toBeTruthy();
  });

  it("skips every row and says so when the file has no company column", async () => {
    render(<TrackerShell />);
    await ready();
    openTab("Settings");
    pickFile("CSV file", "jobs.csv", "title\nAnalyst\nDesigner\n");
    expect(await screen.findByText(/0 of 2 rows are ready to import, 2 skipped./)).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Import 0 jobs" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("reads a bad CSV and a bad backup with specific messages", async () => {
    render(<TrackerShell />);
    await ready();
    openTab("Settings");
    pickFile("CSV file", "jobs.csv", 'title\n"open');
    expect(
      (await screen.findAllByRole("alert")).some((a) => /quote mark/.test(a.textContent ?? "")),
    ).toBe(true);
    pickFile("Backup file", "backup.json", "not json");
    await waitFor(() =>
      expect(
        screen
          .getAllByRole("alert")
          .some((a) => /could not read that file/.test(a.textContent ?? "")),
      ).toBe(true),
    );
  });

  it("restores a JSON backup after a confirm step", async () => {
    seedJobs([storedJob("a")]);
    render(<TrackerShell />);
    await ready();
    const job: Job = {
      id: "z",
      title: "Restored role",
      company: "Acme",
      stageId: "stage-offer",
      notes: "",
      savedAt: "2026-10-01T10:00:00.000Z",
      updatedAt: "2026-10-01T10:00:00.000Z",
    };
    const text = buildTrackerBackup(
      { jobs: [job], stages: [], activities: [], interviews: [], contacts: [] },
      new Date(),
    );
    openTab("Settings");
    pickFile("Backup file", "backup.json", text);
    expect(await screen.findByText(/This backup holds 1 job/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Replace my data with this backup" }));
    openTab("Board");
    expect(await screen.findByText("Restored role")).toBeTruthy();
    expect(screen.queryByText("Role a")).toBeNull();
  });

  it("names the first problem path when a backup has the wrong shape", async () => {
    render(<TrackerShell />);
    await ready();
    openTab("Settings");
    pickFile(
      "Backup file",
      "backup.json",
      JSON.stringify({ kind: "stepkite-tracker-backup", version: 1, jobs: "x" }),
    );
    await waitFor(() =>
      expect(screen.getAllByRole("alert").some((a) => /first is at/.test(a.textContent ?? ""))).toBe(true),
    );
  });

  it("puts earlier data back when a restore cannot be written", async () => {
    seedJobs([storedJob("a")]);
    render(<TrackerShell />);
    await ready();
    const job: Job = {
      id: "z",
      title: "Restored role",
      company: "Acme",
      stageId: "stage-offer",
      notes: "",
      savedAt: "2026-10-01T10:00:00.000Z",
      updatedAt: "2026-10-01T10:00:00.000Z",
    };
    const text = buildTrackerBackup(
      { jobs: [job], stages: [], activities: [], interviews: [], contacts: [] },
      new Date(),
    );
    openTab("Settings");
    pickFile("Backup file", "backup.json", text);
    await screen.findByText(/This backup holds 1 job/);
    control.failWrite = ["z"];
    fireEvent.click(screen.getByRole("button", { name: "Replace my data with this backup" }));
    await waitFor(() =>
      expect(screen.getAllByRole("alert").some((a) => /earlier data was put back/.test(a.textContent ?? ""))).toBe(true),
    );
    const ids = await listIds("jobs");
    expect(ids.ok && ids.value).toEqual(["a"]);
  });

  it("asks before deleting rows that cannot be read", async () => {
    seedJobs([storedJob("a"), { id: "bad", nope: true }]);
    render(<TrackerShell />);
    await ready();
    openTab("Settings");
    fireEvent.click(screen.getByRole("button", { name: "Delete all data" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete everything" }));
    const second = await screen.findByRole("dialog", { name: "Some items could not be read" });
    expect(within(second).getByText(/These cannot be undone/)).toBeTruthy();
    expect((await listIds("jobs")).ok && true).toBe(true);
    const before = await listIds("jobs");
    expect(before.ok && before.value.sort()).toEqual(["a", "bad"]);
    fireEvent.click(within(second).getByRole("button", { name: "Delete everything including them" }));
    await waitFor(async () => {
      const ids = await listIds("jobs");
      expect(ids.ok && ids.value.length).toBe(0);
    });
  });

  it("deletes all data after a confirm, and Undo brings it back within 10 seconds", async () => {
    seedJobs([storedJob("a")]);
    render(<TrackerShell />);
    await ready();
    openTab("Settings");
    fireEvent.click(screen.getByRole("button", { name: "Delete all data" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/undo for 10 seconds/)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete everything" }));
    await waitFor(async () => {
      const ids = await listIds("jobs");
      expect(ids.ok && ids.value.length).toBe(0);
    });
    expect(screen.getByText("Deleted all your tracker data.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    await waitFor(async () => {
      const ids = await listIds("jobs");
      expect(ids.ok && ids.value).toEqual(["a"]);
    });
  });
});
