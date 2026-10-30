import { describe, expect, it } from "vitest";
import { ukCvRules } from "./uk";

describe("ukCvRules", () => {
  it("has the expected shape", () => {
    expect(ukCvRules.country).toBe("uk");
    expect(ukCvRules.maxPages).toBe(2);
    expect(ukCvRules.photo).toBe("avoid");
    expect(ukCvRules.allowDateOfBirth).toBe(false);
    expect(ukCvRules.allowNationality).toBe(false);
    expect(ukCvRules.allowMaritalStatus).toBe(false);
    expect(ukCvRules.documentName).toBe("CV");
    expect(ukCvRules.paper).toBe("A4");
    expect(ukCvRules.spelling).toBe("en-GB");
  });

  it("is verified only when a date format is set", () => {
    expect(ukCvRules.verified).toBe(ukCvRules.dateFormat !== null);
  });
});
