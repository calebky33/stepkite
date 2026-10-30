import { describe, expect, it } from "vitest";
import { usCvRules } from "./us";

describe("usCvRules", () => {
  it("has the expected shape", () => {
    expect(usCvRules.country).toBe("us");
    expect(usCvRules.maxPages).toBe(1);
    expect(usCvRules.photo).toBe("avoid");
    expect(usCvRules.allowDateOfBirth).toBe(false);
    expect(usCvRules.allowNationality).toBe(false);
    expect(usCvRules.allowMaritalStatus).toBe(false);
    expect(usCvRules.documentName).toBe("Resume");
    expect(usCvRules.paper).toBe("Letter");
    expect(usCvRules.spelling).toBe("en-US");
    expect(usCvRules.sources).toEqual([]);
  });

  it("marks the rules verified only with a date format and a source", () => {
    const rules = usCvRules;
    if (rules.verified) {
      expect(rules.dateFormat).not.toBeNull();
      expect(rules.sources.length).toBeGreaterThan(0);
    } else {
      expect(rules.dateFormat).toBeNull();
    }
  });
});
