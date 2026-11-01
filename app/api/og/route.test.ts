import { describe, expect, it } from "vitest";
import { GET } from "./route";

const call = (qs: string) => GET(new Request(`http://localhost/api/og${qs}`));

describe("GET /api/og", () => {
  it("returns a cached image with defaults", async () => {
    const res = call("");
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=86400");
    expect(res.headers.get("content-type")).toContain("image/png");
  });

  it("accepts title, subtitle and country", () => {
    expect(call("?title=50%2C000%20after%20tax&subtitle=UK&country=uk").status).toBe(200);
  });

  it("keeps the older gross param working", () => {
    expect(call("?country=uk&gross=50000").status).toBe(200);
  });

  it("rejects fields over 100 characters", () => {
    expect(call(`?title=${"a".repeat(101)}`).status).toBe(400);
    expect(call(`?subtitle=${"a".repeat(101)}`).status).toBe(400);
  });

  it("rejects an unknown country", () => {
    expect(call("?country=fr").status).toBe(400);
  });
});
