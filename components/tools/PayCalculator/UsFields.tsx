"use client";

import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { COUNTRY_INFO } from "@/lib/countries";
import { usStates } from "@/lib/tax/us/states.2026";
import type { FieldsProps } from "./fieldTypes";

const info = COUNTRY_INFO.us;

/** The ten largest states by population come first, then every other state and DC by name. */
export const LARGEST = [
  "california",
  "texas",
  "florida",
  "new-york",
  "pennsylvania",
  "illinois",
  "ohio",
  "georgia",
  "north-carolina",
  "michigan",
];

/** Built from the rates file, so a state moves out of "not counted yet" the moment it is sourced. */
function stateOption(slug: string) {
  const rule = usStates[slug];
  return {
    value: slug,
    label: rule.kind === "pending" ? `${rule.name} (state tax not included)` : rule.name,
  };
}

export const STATES = [
  ...LARGEST.filter((slug) => Object.hasOwn(usStates, slug)).map(stateOption),
  ...Object.entries(usStates)
    .filter(([slug]) => !LARGEST.includes(slug))
    .sort(([, a], [, b]) => a.name.localeCompare(b.name, "en-US"))
    .map(([slug]) => stateOption(slug)),
];

const FILING_STATUSES = [
  { value: "single", label: "Single" },
  { value: "married-jointly", label: "Married filing jointly" },
  { value: "head-of-household", label: "Head of household" },
];

const FREQUENCIES = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every two weeks" },
  { value: "semimonthly", label: "Twice a month" },
  { value: "monthly", label: "Monthly" },
];

export function UsFields({ values, errors, onChange }: FieldsProps) {
  const chosen =
    values.region && Object.hasOwn(usStates, values.region) ? usStates[values.region] : undefined;
  const stateHint =
    chosen?.kind === "pending"
      ? "State tax is not included for this state yet."
      : "The ten largest states are first. City taxes are not counted.";
  return (
    <div className="flex flex-col gap-4">
      <Select
        label="State"
        hint={stateHint}
        options={STATES}
        value={values.region}
        onValueChange={(v) => onChange("region", v)}
      />
      <Select
        label="Filing status"
        hint="The status you use on your federal return."
        options={FILING_STATUSES}
        value={values.filingStatus}
        onValueChange={(v) => onChange("filingStatus", v)}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Pre-tax 401(k) contribution"
          hint="A percentage of your salary. Leave blank for none."
          error={errors.retirementPercent}
          inputMode="decimal"
          autoComplete="off"
          value={values.retirementPercent ?? ""}
          onChange={(e) => onChange("retirementPercent", e.target.value)}
        />
        <Select
          label="Pay frequency"
          hint="How often your paycheck arrives."
          options={FREQUENCIES}
          value={values.payFrequency}
          onValueChange={(v) => onChange("payFrequency", v)}
        />
      </div>
      <CurrencyInput
        label="Other deductions"
        hint="A yearly total, taken off after tax."
        error={errors.otherDeductions}
        locale={info.locale}
        currency={info.currency}
        value={values.otherDeductions ? Number(values.otherDeductions) : null}
        onValueChange={(n) => onChange("otherDeductions", n === null ? "" : String(n))}
      />
    </div>
  );
}
