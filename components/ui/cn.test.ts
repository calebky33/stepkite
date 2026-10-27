import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("joins truthy parts and drops the rest", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });
});
