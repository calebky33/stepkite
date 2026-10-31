import { afterEach, describe, expect, it } from "vitest";
import { dueInstant, endOfLocalDayIso, normaliseDate, startOfLocalDayIso } from "./dates";
import { overdueJobs, upcomingReminders } from "./reminders";
import { makeJob } from "./fixtures.test-util";

const original = process.env.TZ;
afterEach(() => {
  if (original === undefined) delete process.env.TZ;
  else process.env.TZ = original;
});

function inZone(tz: string): void {
  process.env.TZ = tz;
  // Fails loudly if the runtime ignores TZ, which would make every zone test below meaningless.
  const offset = new Date(2026, 3, 1).getTimezoneOffset();
  if (tz === "America/Los_Angeles") expect(offset).toBe(420);
  if (tz === "Asia/Kolkata") expect(offset).toBe(-330);
}

describe("time zone really changes", () => {
  it("applies TZ to Date", () => {
    inZone("America/Los_Angeles");
    expect(new Date(2026, 3, 1).getTimezoneOffset()).toBe(420);
    inZone("Asia/Kolkata");
    expect(new Date(2026, 3, 1).getTimezoneOffset()).toBe(-330);
  });
});

describe("date only values in America/Los_Angeles", () => {
  it("maps a local day to absolute instants", () => {
    inZone("America/Los_Angeles");
    expect(endOfLocalDayIso("2026-04-01")).toBe("2026-04-02T06:59:59.999Z");
    expect(startOfLocalDayIso("2026-04-01")).toBe("2026-04-01T07:00:00.000Z");
  });
  it("handles the 23 hour spring forward day", () => {
    inZone("America/Los_Angeles");
    expect(startOfLocalDayIso("2026-03-08")).toBe("2026-03-08T08:00:00.000Z");
    expect(endOfLocalDayIso("2026-03-08")).toBe("2026-03-09T06:59:59.999Z");
    const ms = Date.parse(endOfLocalDayIso("2026-03-08") ?? "") - Date.parse(startOfLocalDayIso("2026-03-08") ?? "");
    expect(ms).toBe(23 * 3600_000 - 1);
  });
  it("normaliseDate gives start and end", () => {
    inZone("America/Los_Angeles");
    expect(normaliseDate("2026-04-01")).toBe("2026-04-01T07:00:00.000Z");
    expect(normaliseDate("2026-04-01", true)).toBe("2026-04-02T06:59:59.999Z");
  });
  it("a step due today is not overdue until the local day ends", () => {
    inZone("America/Los_Angeles");
    const job = makeJob({ nextStep: { text: "Call", dueAt: "2026-04-01" } });
    expect(overdueJobs([job], "2026-04-01T16:00:00.000Z")).toEqual([]);
    expect(upcomingReminders([job], "2026-04-01T16:00:00.000Z")).toHaveLength(1);
    expect(overdueJobs([job], "2026-04-02T07:00:00.000Z")).toHaveLength(1);
  });
});

describe("date only values in Asia/Kolkata", () => {
  it("maps a local day to absolute instants", () => {
    inZone("Asia/Kolkata");
    expect(endOfLocalDayIso("2026-04-01")).toBe("2026-04-01T18:29:59.999Z");
    expect(startOfLocalDayIso("2026-04-01")).toBe("2026-03-31T18:30:00.000Z");
    expect(normaliseDate("2026-04-01", true)).toBe("2026-04-01T18:29:59.999Z");
  });
  it("a step due today is not overdue until the local day ends", () => {
    inZone("Asia/Kolkata");
    const job = makeJob({ nextStep: { text: "Call", dueAt: "2026-04-01" } });
    expect(overdueJobs([job], "2026-04-01T18:00:00.000Z")).toEqual([]);
    expect(overdueJobs([job], "2026-04-01T18:31:00.000Z")).toHaveLength(1);
  });
});

describe("leap days", () => {
  it("accepts 2028-02-29 and rejects 2026-02-29", () => {
    inZone("Asia/Kolkata");
    expect(normaliseDate("2028-02-29")).toBe("2028-02-28T18:30:00.000Z");
    expect(normaliseDate("2026-02-29")).toBeNull();
    expect(endOfLocalDayIso("2026-02-29")).toBeNull();
  });
});

describe("dueInstant and normaliseDate", () => {
  it("passes full instants through", () => {
    expect(dueInstant("2026-04-01T10:00:00.000Z")).toBe(Date.parse("2026-04-01T10:00:00.000Z"));
  });
  it("normalises an offset date to UTC", () => {
    expect(normaliseDate("2026-04-01T10:00:00+01:00")).toBe("2026-04-01T09:00:00.000Z");
  });
  it("rejects impossible dates and text", () => {
    expect(normaliseDate("2026-02-31")).toBeNull();
    expect(normaliseDate("soon")).toBeNull();
    expect(normaliseDate("2026-13-01T00:00:00Z")).toBeNull();
    expect(Number.isNaN(dueInstant("soon"))).toBe(true);
  });
});
