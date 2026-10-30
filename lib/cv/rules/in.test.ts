import { describe, expect, it } from "vitest";
import { inCvRules } from "./in";

describe("inCvRules", () => {
  it("has the expected shape", () => {
    expect(inCvRules.country).toBe("in");
    expect(inCvRules.maxPages).toBe(2);
    expect(inCvRules.photo).toBe("unknown");
    expect(inCvRules.allowDateOfBirth).toBe(false);
    expect(inCvRules.allowNationality).toBe(false);
    expect(inCvRules.allowMaritalStatus).toBe(false);
    expect(inCvRules.documentName).toBe("CV");
    expect(inCvRules.paper).toBe("A4");
    expect(inCvRules.spelling).toBe("en-IN");
    expect(inCvRules.sources).toEqual([]);
  });

  it("marks the rules verified only with a date format and a source", () => {
    const rules = inCvRules;
    if (rules.verified) {
      expect(rules.dateFormat).not.toBeNull();
      expect(rules.sources.length).toBeGreaterThan(0);
    } else {
      expect(rules.dateFormat).toBeNull();
    }
  });
});
