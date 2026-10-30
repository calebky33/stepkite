import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ImportError } from "@/lib/cv/import/file";

const db = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn() }));
const reader = vi.hoisted(() => ({ extract: vi.fn() }));

vi.mock("@/lib/storage/db", () => ({
  readItem: db.read,
  writeItem: db.write,
  removeItem: vi.fn().mockResolvedValue({ ok: true, value: null }),
  listIds: vi.fn().mockResolvedValue({ ok: true, value: [] }),
  readAll: vi.fn().mockResolvedValue({ ok: true, value: { items: [], skipped: 0 } }),
  clearEverything: vi.fn().mockResolvedValue({ ok: true, value: null }),
}));
vi.mock("@/lib/cv/import/extract", () => ({ extractText: reader.extract }));

import { CvImportScreen } from "./CvImportScreen";

const TEXT = `Priya Nair
priya.nair@example.co.uk

Work Experience
Jan 2020 - Mar 2021
- Handled 40 tickets a day

Education
BA History, University of Leeds
2014 - 2017

Interests
Hockey

Languages
Fluent in Hindi
`;

const cvWrites = () => db.write.mock.calls.filter((call) => call[0] === "cvs");

function setup() {
  const onCancel = vi.fn();
  const onCreated = vi.fn();
  render(<CvImportScreen country="uk" onCancel={onCancel} onCreated={onCreated} />);
  return { onCancel, onCreated };
}

async function chooseFile(name = "old.txt") {
  const input = screen.getByLabelText("Choose your old CV file") as HTMLInputElement;
  fireEvent.change(input, { target: { files: [new File(["x"], name, { type: "text/plain" })] } });
}

beforeEach(() => {
  db.read.mockReset().mockResolvedValue({ ok: false, reason: "missing" });
  db.write.mockReset().mockResolvedValue({ ok: true, value: null });
  reader.extract.mockReset().mockResolvedValue({ text: TEXT, kind: "txt", notes: [] });
});

describe("CvImportScreen", () => {
  it("states that the file stays on the device and asks for a file", () => {
    setup();
    expect(screen.getByRole("heading", { name: "Upload your old CV" })).toBeTruthy();
    expect(screen.getByText(/never uploaded/)).toBeTruthy();
    expect(screen.getByLabelText("Choose your old CV file").getAttribute("accept")).toBe(
      ".pdf,.docx,.txt",
    );
  });

  it("shows a plain message for each kind of bad file and lets you choose again", async () => {
    setup();
    for (const code of ["password", "scanned", "too-big", "wrong-type"] as const) {
      reader.extract.mockRejectedValueOnce(new ImportError(code));
      await chooseFile();
      const alert = await screen.findByRole("alert");
      expect(alert.textContent?.length).toBeGreaterThan(20);
      expect(screen.getByRole("button", { name: "Choose a file" })).toBeTruthy();
    }
  });

  it("shows low confidence items first and saves nothing before you confirm", async () => {
    setup();
    await chooseFile();
    await screen.findByRole("heading", { name: /Check what we found/ });
    const groups = screen.getAllByRole("region").map((r) => r.getAttribute("aria-label"));
    expect(groups.indexOf("Check these first")).toBeLessThan(groups.indexOf("Probably right"));
    expect(groups.indexOf("Probably right")).toBeLessThan(groups.indexOf("Looks right"));
    const first = within(screen.getByRole("region", { name: "Check these first" }));
    expect(first.getByRole("heading", { name: "Job" })).toBeTruthy();
    expect(cvWrites()).toHaveLength(0);
    expect(db.write).not.toHaveBeenCalled();
  });

  it("lists text that has no field under Not placed and copies it", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    setup();
    await chooseFile();
    const section = within(await screen.findByRole("region", { name: "Not placed" }));
    expect(section.getByText("languages: Fluent in Hindi")).toBeTruthy();
    fireEvent.click(section.getByRole("button", { name: "Copy all unplaced text" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("languages: Fluent in Hindi"));
  });

  it("blocks Create until a bad date is fixed or the item is dropped", async () => {
    setup();
    await chooseFile();
    const create = (await screen.findByRole("button", {
      name: "Create my CV",
    })) as HTMLButtonElement;
    expect(create.disabled).toBe(true);
    const start = screen.getByLabelText("Start (job)");
    fireEvent.change(start, { target: { value: "2020-01" } });
    await waitFor(() => expect(create.disabled).toBe(true));
    fireEvent.click(screen.getByLabelText(/Keep this job/));
    await waitFor(() => expect(create.disabled).toBe(false));
  });

  it("creates a new CV with a new id only after confirm, and keeps edits and drops", async () => {
    const { onCreated } = setup();
    await chooseFile();
    await screen.findByRole("heading", { name: /Check what we found/ });
    fireEvent.change(screen.getByLabelText("Job title (job)"), {
      target: { value: "Support lead" },
    });
    fireEvent.change(screen.getByLabelText("Employer (job)"), { target: { value: "Acme" } });
    fireEvent.click(screen.getByLabelText(/Keep this interests/));
    expect(cvWrites()).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Create my CV" }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(cvWrites()).toHaveLength(1);
    const saved = cvWrites()[0]?.[3] as {
      id: string;
      country: string;
      experience: { role: string; employer: string }[];
      interests: string;
      contact: { fullName: string };
    };
    expect(saved.id).not.toBe("default");
    expect(onCreated).toHaveBeenCalledWith(saved.id);
    expect(saved.country).toBe("uk");
    expect(saved.experience[0]).toMatchObject({ role: "Support lead", employer: "Acme" });
    expect(saved.interests).toBe("");
    expect(saved.contact.fullName).toBe("Priya Nair");
  });

  it("creates only one CV when Create is clicked twice quickly", async () => {
    let release: (v: { ok: true; value: null }) => void = () => undefined;
    db.write.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const { onCreated } = setup();
    await chooseFile();
    await screen.findByRole("heading", { name: /Check what we found/ });
    fireEvent.change(screen.getByLabelText("Job title (job)"), {
      target: { value: "Support lead" },
    });
    fireEvent.change(screen.getByLabelText("Employer (job)"), { target: { value: "Acme" } });
    fireEvent.click(screen.getByLabelText(/Keep this interests/));
    const create = screen.getByRole("button", { name: "Create my CV" });
    fireEvent.click(create);
    fireEvent.click(create);
    release({ ok: true, value: null });
    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(cvWrites()).toHaveLength(1);
  });

  it("goes back when you cancel without edits and asks first when you have edited", async () => {
    const { onCancel } = setup();
    await chooseFile();
    await screen.findByRole("heading", { name: /Check what we found/ });
    fireEvent.keyDown(screen.getByRole("heading", { name: /Check what we found/ }), {
      key: "Escape",
    });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("asks before leaving when something was edited", async () => {
    const { onCancel } = setup();
    await chooseFile();
    await screen.findByRole("heading", { name: /Check what we found/ });
    fireEvent.change(screen.getByLabelText("Job title (job)"), { target: { value: "Lead" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: "Leave" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(db.write).not.toHaveBeenCalled();
  });
});
