import { describe, expect, it } from "vitest";
import {
  TRIAL_EXPORTS_PER_DAY,
  canExportDuringTrial,
  hasProAccess,
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

  it("hasProAccess lets an active plan run three days past its period end, then stops", () => {
    const now = new Date("2026-11-10T12:00:00.000Z");
    const active = { ...FREE, planCode: "monthly" as const, status: "active" as const };
    expect(hasProAccess({ ...active, currentPeriodEnd: "2026-11-08T12:00:00.000Z" }, now)).toBe(
      true,
    );
    expect(hasProAccess({ ...active, currentPeriodEnd: "2026-11-06T12:00:00.000Z" }, now)).toBe(
      false,
    );
    expect(hasProAccess({ ...active, currentPeriodEnd: null }, now)).toBe(true);
    expect(
      hasProAccess(
        {
          ...FREE,
          planCode: "lifetime",
          status: "active",
          currentPeriodEnd: "2020-01-01T00:00:00.000Z",
        },
        now,
      ),
    ).toBe(true);
  });

  it("hasProAccess keeps a cancelled plan until its end date, then stops", () => {
    const now = new Date("2026-11-10T12:00:00.000Z");
    const cancelled = {
      ...FREE,
      planCode: "monthly" as const,
      status: "active" as const,
      currentPeriodEnd: "2026-11-30T12:00:00.000Z",
    };
    expect(hasProAccess({ ...cancelled, cancelAt: "2026-11-30T12:00:00.000Z" }, now)).toBe(true);
    expect(hasProAccess({ ...cancelled, cancelAt: "2026-11-09T12:00:00.000Z" }, now)).toBe(false);
  });

  it("hasProAccess is false for past_due", () => {
    expect(hasProAccess({ ...FREE, planCode: "monthly", status: "past_due" })).toBe(false);
  });
});
