import { describe, expect, it } from "vitest";
import { verifyPaystackSignature } from "./paystack";

async function hmacSha512Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  const bytes = new Uint8Array(sig);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) hex += bytes[i]!.toString(16).padStart(2, "0");
  return hex;
}

const SECRET = "whsec_test";
const SECRET_KEY = "sk_test_legacy";
const BODY = '{"event":"charge.success","data":{"reference":"abc"}}';

describe("verifyPaystackSignature", () => {
  it("accepts a current v1 signature inside the tolerance", async () => {
    const t = 1_700_000_000;
    const kid = "whk_1";
    const sig = await hmacSha512Hex(SECRET, `${t}.${kid}.${BODY}`);
    expect(
      await verifyPaystackSignature({
        rawBody: BODY,
        signatureHeader: `t=${t},v1=${kid}:${sig}`,
        legacyHeader: null,
        signingSecret: SECRET,
        secretKey: SECRET_KEY,
        now: t + 10,
      }),
    ).toBe(true);
  });

  it("accepts a legacy x-paystack-signature over the raw body", async () => {
    const sig = await hmacSha512Hex(SECRET_KEY, BODY);
    expect(
      await verifyPaystackSignature({
        rawBody: BODY,
        signatureHeader: null,
        legacyHeader: sig,
        signingSecret: SECRET,
        secretKey: SECRET_KEY,
        now: 0,
      }),
    ).toBe(true);
  });

  it("rejects a tampered body", async () => {
    const t = 1_700_000_000;
    const kid = "whk_1";
    const sig = await hmacSha512Hex(SECRET, `${t}.${kid}.${BODY}`);
    expect(
      await verifyPaystackSignature({
        rawBody: BODY + " ",
        signatureHeader: `t=${t},v1=${kid}:${sig}`,
        legacyHeader: null,
        signingSecret: SECRET,
        secretKey: null,
        now: t,
      }),
    ).toBe(false);
  });

  it("rejects a replay outside the 300s tolerance", async () => {
    const t = 1_700_000_000;
    const kid = "whk_1";
    const sig = await hmacSha512Hex(SECRET, `${t}.${kid}.${BODY}`);
    expect(
      await verifyPaystackSignature({
        rawBody: BODY,
        signatureHeader: `t=${t},v1=${kid}:${sig}`,
        legacyHeader: null,
        signingSecret: SECRET,
        secretKey: null,
        now: t + 600,
      }),
    ).toBe(false);
  });

  it("rejects when no secret is configured", async () => {
    expect(
      await verifyPaystackSignature({
        rawBody: BODY,
        signatureHeader: "t=1,v1=whk_1:deadbeef",
        legacyHeader: "deadbeef",
        signingSecret: null,
        secretKey: null,
      }),
    ).toBe(false);
  });
});
