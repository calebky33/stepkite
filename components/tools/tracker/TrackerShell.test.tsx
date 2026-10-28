import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ list: vi.fn(), read: vi.fn(), write: vi.fn() }));

vi.mock("@/lib/storage/db", () => ({
  listIds: db.list,
  readItem: db.read,
  writeItem: db.write,
}));

import { TrackerShell } from "./TrackerShell";

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
});
