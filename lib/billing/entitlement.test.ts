import { describe, expect, it } from "vitest";
import {
  TRIAL_EXPORTS_PER_DAY,
  canExportDuringTrial,
  hasProAccess,
  readEntitlement,
  type Entitlement,
} from "./entitlement";

const FREE: Entitlement = {
  planCode: "free",
  status: "none",
  trialEndsAt: null,
  currentPeriodEnd: null,
  cancelAt: null,
  trialExportsToday: 0,
};

describe("entitlement helpers", () => {
  it("hasProAccess is false for free and canceled", () => {
    expect(hasProAccess(FREE)).toBe(false);
    expect(hasProAccess({ ...FREE, planCode: "monthly", status: "canceled" })).toBe(false);
    expect(hasProAccess({ ...FREE, planCode: "yearly", status: "revoked" })).toBe(false);
  });

  it("hasProAccess is true for lifetime, trialing and active", () => {
    expect(hasProAccess({ ...FREE, planCode: "lifetime", status: "active" })).toBe(true);
    expect(hasProAccess({ ...FREE, planCode: "trial", status: "trialing" })).toBe(true);
    expect(hasProAccess({ ...FREE, planCode: "monthly", status: "active" })).toBe(true);
  });

  it("canExportDuringTrial honours the daily cap", () => {
    const trialing = { ...FREE, planCode: "trial" as const, status: "trialing" as const };
    expect(canExportDuringTrial(trialing)).toBe(true);
    expect(canExportDuringTrial({ ...trialing, trialExportsToday: 1 })).toBe(true);
    expect(canExportDuringTrial({ ...trialing, trialExportsToday: TRIAL_EXPORTS_PER_DAY })).toBe(
      false,
    );
    expect(canExportDuringTrial(FREE)).toBe(false);
  });

  it("readEntitlement returns the free default until Supabase is wired", async () => {
    const e = await readEntitlement("anyone");
    expect(e.planCode).toBe("free");
    expect(e.status).toBe("none");
  });
});
