import { describe, expect, it } from "vitest";
import { safeHref } from "./links";

describe("safeHref", () => {
  it("allows http and https", () => {
    expect(safeHref("https://example.com/me")).toBe("https://example.com/me");
    expect(safeHref(" http://example.com ")).toBe("http://example.com/");
  });

  it("refuses script, data and relative URLs", () => {
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("data:text/html,hi")).toBeNull();
    expect(safeHref("/etc/passwd")).toBeNull();
    expect(safeHref("")).toBeNull();
  });
});
