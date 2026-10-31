import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/storage/db", () => import("@/lib/storage/memoryDb"));

import { resetMemoryDb } from "@/lib/storage/memoryDb";
import { TrackerShell } from "./TrackerShell";
import { openTab, seedJobs, storedJob, type } from "./testkit.test-util";

beforeEach(() => resetMemoryDb());

describe("worst case data", () => {
  it("draws 500 jobs one page at a time on the board and in the list", async () => {
    seedJobs(Array.from({ length: 500 }, (_, i) => storedJob(`j${i}`)));
    render(<TrackerShell />);
    const saved = await screen.findByRole("region", { name: /^Saved/ });
    expect(saved.querySelectorAll("li")).toHaveLength(50);
    expect(saved.querySelector("h2")?.textContent).toContain("500");
    openTab("List");
    const table = await screen.findByRole("table", { name: "All jobs" });
    expect(table.querySelectorAll("tbody tr")).toHaveLength(100);
    fireEvent.click(screen.getByRole("button", { name: "Show 100 more" }));
    expect(table.querySelectorAll("tbody tr")).toHaveLength(200);
  }, 20_000);

  it("lets a 160 character title with no spaces wrap anywhere", async () => {
    const long = "W".repeat(160);
    seedJobs([storedJob("a", { title: long, company: "C".repeat(160) })]);
    render(<TrackerShell />);
    const title = await screen.findByRole("button", { name: long });
    expect(title.className).toContain("[overflow-wrap:anywhere]");
    fireEvent.click(title);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { level: 2 }).className).toContain(
      "[overflow-wrap:anywhere]",
    );
  });

  it("tells you when a typed title is too long instead of cutting it off", async () => {
    render(<TrackerShell />);
    await screen.findByText(/No jobs saved yet/);
    type("Job title", "W".repeat(300));
    type("Company", "Acme");
    fireEvent.click(screen.getByRole("button", { name: "Add job" }));
    expect(screen.getByText("Keep the title under 160 characters.")).toBeTruthy();
  });

  it("shows right to left text as written", async () => {
    seedJobs([storedJob("a", { title: "مهندس برمجيات", company: "שלום עולם" })]);
    render(<TrackerShell />);
    expect(await screen.findByRole("button", { name: "مهندس برمجيات" })).toBeTruthy();
    expect(screen.getByText("שלום עולם")).toBeTruthy();
  });

  it("keeps a saved job whose company is missing from showing, and says so", async () => {
    seedJobs([storedJob("a", { company: "" })]);
    render(<TrackerShell />);
    expect((await screen.findByRole("alert")).textContent).toContain("could not be read");
  });

  it("has a plain empty state on every tab", async () => {
    render(<TrackerShell />);
    await screen.findByText(/No jobs saved yet/);
    openTab("List");
    expect(screen.getByText(/No jobs saved yet/)).toBeTruthy();
    openTab("Interviews");
    expect(screen.getByText(/No interviews coming up/)).toBeTruthy();
    expect(screen.getByText(/No past interviews/)).toBeTruthy();
    openTab("Contacts");
    expect(screen.getByText(/No contacts yet/)).toBeTruthy();
    openTab("Metrics");
    expect(screen.getAllByText("Not enough data yet").length).toBeGreaterThan(0);
    openTab("Settings");
    expect(screen.getByText("Add a job before you export.")).toBeTruthy();
  });
});
