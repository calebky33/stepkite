import { describe, expect, it } from "vitest";
import { attachContact, deleteContact, detachContact } from "./contacts";
import { contactSchema } from "./schema";
import { NOW, makeJob } from "./fixtures.test-util";

describe("contactSchema", () => {
  it("needs a name and checks the email", () => {
    expect(contactSchema.safeParse({ id: "c1", name: "Sam" }).success).toBe(true);
    expect(contactSchema.safeParse({ id: "c1", name: " " }).success).toBe(false);
    expect(contactSchema.safeParse({ id: "c1", name: "Sam", email: "nope" }).success).toBe(false);
  });
});

describe("attach and detach", () => {
  it("attaches once, never twice", () => {
    const a = attachContact(makeJob(), "c1", NOW);
    expect(a.contactIds).toEqual(["c1"]);
    expect(a.updatedAt).toBe(NOW);
    expect(attachContact(a, "c1", NOW)).toBe(a);
  });
  it("detaches and ignores a contact that is not attached", () => {
    const a = makeJob({ contactIds: ["c1", "c2"] });
    expect(detachContact(a, "c1", NOW).contactIds).toEqual(["c2"]);
    expect(detachContact(a, "zz", NOW)).toBe(a);
  });
  it("lets one contact sit on several jobs", () => {
    const j1 = attachContact(makeJob({ id: "j1" }), "c1", NOW);
    const j2 = attachContact(makeJob({ id: "j2" }), "c1", NOW);
    expect([j1, j2].every((j) => j.contactIds?.includes("c1"))).toBe(true);
  });
});

describe("deleteContact", () => {
  it("removes the contact and unlinks every job, leaving others alone", () => {
    const jobs = [
      makeJob({ id: "j1", contactIds: ["c1", "c2"] }),
      makeJob({ id: "j2", contactIds: ["c1"] }),
      makeJob({ id: "j3" }),
    ];
    const contacts = [
      { id: "c1", name: "A" },
      { id: "c2", name: "B" },
    ];
    const out = deleteContact("c1", contacts, jobs, NOW);
    expect(out.contacts.map((c) => c.id)).toEqual(["c2"]);
    expect(out.jobs.map((j) => j.contactIds ?? [])).toEqual([["c2"], [], []]);
    expect(out.changedJobIds).toEqual(["j1", "j2"]);
    expect(out.jobs[2]).toBe(jobs[2]);
  });
});
