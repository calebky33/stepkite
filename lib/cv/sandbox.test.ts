import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cvStore = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock("@/lib/storage/cvStore", () => ({ saveCv: cvStore.save }));

import { emptyCv, type Cv } from "@/lib/cv/schema";
import {
  SANDBOX_KEY,
  clearSandboxDraft,
  migrateSandboxToAccount,
  readSandboxDraft,
  writeSandboxDraft,
} from "./sandbox";

const NOW = "2026-11-01T09:00:00.000Z";
const make = (): Cv => ({
  ...emptyCv("cv-sandbox", "uk", NOW),
  title: "First draft",
  contact: {
    fullName: "Asha Rao",
    email: "asha@example.com",
    phone: "",
    city: "Leeds",
    links: [],
  },
  summary: "Software engineer with five years of experience shipping web products.",
});

beforeEach(() => {
  localStorage.clear();
  cvStore.save.mockReset().mockResolvedValue({ ok: true, value: null });
});

afterEach(() => {
  localStorage.clear();
});

describe("sandbox read, write and clear", () => {
  it("returns null when nothing is saved", () => {
    expect(readSandboxDraft()).toBeNull();
  });

  it("writes and reads back a draft", () => {
    const draft = make();
    expect(writeSandboxDraft(draft)).toBe(true);
    expect(localStorage.getItem(SANDBOX_KEY)).not.toBeNull();
    const read = readSandboxDraft();
    expect(read?.contact.fullName).toBe("Asha Rao");
    expect(read?.title).toBe("First draft");
  });

  it("returns null when the saved value is not valid JSON", () => {
    localStorage.setItem(SANDBOX_KEY, "not-json");
    expect(readSandboxDraft()).toBeNull();
  });

  it("returns null when the saved value no longer matches the CV schema", () => {
    localStorage.setItem(SANDBOX_KEY, JSON.stringify({ hello: "world" }));
    expect(readSandboxDraft()).toBeNull();
  });

  it("clears the saved draft", () => {
    writeSandboxDraft(make());
    clearSandboxDraft();
    expect(localStorage.getItem(SANDBOX_KEY)).toBeNull();
    expect(readSandboxDraft()).toBeNull();
  });
});

describe("migrateSandboxToAccount", () => {
  it("copies the draft into cvStore and clears the sandbox", async () => {
    const draft = make();
    writeSandboxDraft(draft);
    const id = await migrateSandboxToAccount("user-123");
    expect(id).toBe("cv-sandbox");
    expect(cvStore.save).toHaveBeenCalledTimes(1);
    const written = cvStore.save.mock.calls[0]?.[0] as Cv;
    expect(written.contact.fullName).toBe("Asha Rao");
    expect(localStorage.getItem(SANDBOX_KEY)).toBeNull();
  });

  it("returns null when there is no draft", async () => {
    const id = await migrateSandboxToAccount("user-123");
    expect(id).toBeNull();
    expect(cvStore.save).not.toHaveBeenCalled();
  });

  it("returns null and keeps the draft when saving fails", async () => {
    cvStore.save.mockResolvedValueOnce({ ok: false, reason: "unavailable" });
    writeSandboxDraft(make());
    const id = await migrateSandboxToAccount("user-123");
    expect(id).toBeNull();
    expect(localStorage.getItem(SANDBOX_KEY)).not.toBeNull();
  });

  it("refuses an empty user id", async () => {
    writeSandboxDraft(make());
    const id = await migrateSandboxToAccount("");
    expect(id).toBeNull();
    expect(cvStore.save).not.toHaveBeenCalled();
  });
});
