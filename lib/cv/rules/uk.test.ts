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

  it("marks the rules verified only with a date format and a source", () => {
    const rules = ukCvRules;
    if (rules.verified) {
      expect(rules.dateFormat).not.toBeNull();
      expect(rules.sources.length).toBeGreaterThan(0);
    } else {
      expect(rules.dateFormat).toBeNull();
    }
  });
});
