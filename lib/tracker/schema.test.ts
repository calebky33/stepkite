import { describe, expect, it } from "vitest";
import { contactSchema, jobSchema } from "./schema";
import { makeJob } from "./fixtures.test-util";

describe("schema checks", () => {
  it("rejects repeated contact ids", () => {
    expect(jobSchema.safeParse(makeJob({ contactIds: ["a", "a"] })).success).toBe(false);
    expect(jobSchema.safeParse(makeJob({ contactIds: ["a", "b"] })).success).toBe(true);
  });
  it("rejects a salary with min above max", () => {
    const salary = (min: number, max: number) =>
      makeJob({ salary: { min, max, currency: "GBP", period: "annual" } });
    expect(jobSchema.safeParse(salary(60, 50)).success).toBe(false);
    expect(jobSchema.safeParse(salary(50, 50)).success).toBe(true);
    expect(
      jobSchema.safeParse(makeJob({ salary: { min: 5, currency: "GBP", period: "annual" } }))
        .success,
    ).toBe(true);
  });
  it("turns an empty email into no email", () => {
    const r = contactSchema.safeParse({ id: "c", name: "A", email: "" });
    expect(r.success && r.data.email).toBeUndefined();
    expect(contactSchema.safeParse({ id: "c", name: "A", email: "nope" }).success).toBe(false);
    expect(contactSchema.safeParse({ id: "c", name: "A", email: "a@b.co" }).success).toBe(true);
    expect(contactSchema.safeParse({ id: "c", name: "A" }).success).toBe(true);
  });
});
