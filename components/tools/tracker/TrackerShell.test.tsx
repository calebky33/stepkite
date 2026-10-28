import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  list: vi.fn(),
  read: vi.fn(),
  write: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@/lib/storage/db", () => ({
  listIds: db.list,
  readItem: db.read,
  writeItem: db.write,
  removeItem: db.remove,
}));

import { STAGE_PAGE, TrackerShell } from "./TrackerShell";

const type = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

async function addJob(title: string, company: string) {
  await screen.findByText(/No jobs saved yet/);
  type("Job title", title);
  type("Company", company);
  fireEvent.click(screen.getByRole("button", { name: "Add job" }));
}

beforeEach(() => {
  db.list.mockReset().mockResolvedValue({ ok: true, value: [] });
  db.read.mockReset();
  db.write.mockReset().mockResolvedValue({ ok: true, value: null });
  db.remove.mockReset().mockResolvedValue({ ok: true, value: null });
});

describe("TrackerShell", () => {
  it("shows the empty state in plain words", async () => {
    render(<TrackerShell />);
    expect(await screen.findByText(/No jobs saved yet/)).toBeTruthy();
  });

  it("adds a job to Saved and stores it", async () => {
    render(<TrackerShell />);
    await addJob("Payroll analyst", "Northwind");
    const saved = screen.getByRole("region", { name: /Saved/ });
    expect(within(saved).getByText("Payroll analyst")).toBeTruthy();
    expect(db.write).toHaveBeenCalledTimes(1);
  });

  it("renders every stage column and moves a job on", async () => {
    render(<TrackerShell />);
    await addJob("Analyst", "Acme");
    for (const name of ["Saved", "Applied", "Interview", "Offer", "Closed"]) {
      expect(screen.getByRole("region", { name: new RegExp(name) })).toBeTruthy();
    }
    fireEvent.click(screen.getByRole("button", { name: "Move Analyst to Applied" }));
    const applied = screen.getByRole("region", { name: /Applied/ });
    expect(within(applied).getByText("Analyst")).toBeTruthy();
  });

  it("asks for a title and company and rejects a bad link", async () => {
    render(<TrackerShell />);
    await screen.findByText(/No jobs saved yet/);
    type(/Link to the job ad/, "not a link");
    fireEvent.click(screen.getByRole("button", { name: "Add job" }));
    expect(screen.getByText("Enter the job title.")).toBeTruthy();
    expect(screen.getByText("Enter the company.")).toBeTruthy();
    expect(screen.getByText(/starts with http or https/)).toBeTruthy();
    expect(db.write).not.toHaveBeenCalled();
  });

  it("deletes a job, then Undo puts it back in its stage and stores it again", async () => {
    render(<TrackerShell />);
    await addJob("Analyst", "Acme");
    db.write.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Delete Analyst" }));
    expect(screen.queryByRole("button", { name: "Delete Analyst" })).toBeNull();
    expect(db.remove).toHaveBeenCalledWith("jobs", expect.any(String));
    expect(screen.getByText("Deleted Analyst.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    const saved = screen.getByRole("region", { name: /Saved/ });
    expect(within(saved).getByText("Analyst")).toBeTruthy();
    expect(db.write).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
  });

  it("drops the Undo bar after 10 seconds and the job stays deleted", async () => {
    render(<TrackerShell />);
    await addJob("Analyst", "Acme");
    vi.useFakeTimers();
    try {
      fireEvent.click(screen.getByRole("button", { name: "Delete Analyst" }));
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

  it("reports when a delete could not be saved", async () => {
    db.remove.mockResolvedValue({ ok: false, reason: "unavailable" });
    render(<TrackerShell />);
    await addJob("Analyst", "Acme");
    fireEvent.click(screen.getByRole("button", { name: "Delete Analyst" }));
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("could not be saved"),
    );
  });

  it("explains when storage is unavailable", async () => {
    db.list.mockResolvedValue({ ok: false, reason: "unavailable" });
    render(<TrackerShell />);
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(
        "Saved jobs cannot be read in this browser",
      ),
    );
  });

  it("loads saved jobs and counts unreadable ones", async () => {
    db.list.mockResolvedValue({ ok: true, value: ["a", "b"] });
    db.read.mockImplementation((_c: string, id: string) =>
      Promise.resolve(
        id === "a"
          ? {
              ok: true,
              value: {
                id: "a",
                title: "Designer",
                company: "Studio",
                stage: "offer",
                updatedAt: "2026-10-01T10:00:00.000Z",
              },
            }
          : { ok: false, reason: "invalid" },
      ),
    );
    render(<TrackerShell />);
    const offer = await screen.findByRole("region", { name: /Offer/ });
    expect(within(offer).getByText("Designer")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("One saved job could not be read");
  });

  it("keeps keyboard focus on the moved card", async () => {
    render(<TrackerShell />);
    await addJob("Analyst", "Acme");
    const button = screen.getByRole("button", { name: "Move Analyst to Applied" });
    button.focus();
    fireEvent.click(button);
    await waitFor(() =>
      expect(document.activeElement?.getAttribute("aria-label")).toBe("Move Analyst to Interview"),
    );
  });

  it("draws one page of cards per stage and shows more on request", async () => {
    const total = STAGE_PAGE * 2 + 10;
    const ids = Array.from({ length: total }, (_, i) => `j${i}`);
    db.list.mockResolvedValue({ ok: true, value: ids });
    db.read.mockImplementation((_c: string, id: string) =>
      Promise.resolve({
        ok: true,
        value: {
          id,
          title: `Role ${id}`,
          company: "Northwind Industries Holdings",
          stage: "saved",
          updatedAt: "2026-10-01T10:00:00.000Z",
        },
      }),
    );
    render(<TrackerShell />);
    const saved = await screen.findByRole("region", { name: /Saved/ });
    expect(within(saved).getAllByRole("listitem")).toHaveLength(STAGE_PAGE);
    fireEvent.click(within(saved).getByRole("button", { name: `Show ${STAGE_PAGE} more` }));
    expect(within(saved).getAllByRole("listitem")).toHaveLength(STAGE_PAGE * 2);
    fireEvent.click(within(saved).getByRole("button", { name: "Show 10 more" }));
    expect(within(saved).getAllByRole("listitem")).toHaveLength(total);
    expect(within(saved).queryByRole("button", { name: /Show d+ more/ })).toBeNull();
  });
});
