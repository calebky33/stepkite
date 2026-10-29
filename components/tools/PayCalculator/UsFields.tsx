"use client";

import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { COUNTRY_INFO } from "@/lib/countries";
import type { FieldsProps } from "./fieldTypes";

const info = COUNTRY_INFO.us;

/** Placeholder list of the largest states. The full list arrives with the state rates. */
const STATES = [
  { value: "california", label: "California" },
  { value: "texas", label: "Texas" },
  { value: "florida", label: "Florida" },
  { value: "new-york", label: "New York" },
  { value: "pennsylvania", label: "Pennsylvania" },
  { value: "illinois", label: "Illinois" },
  { value: "ohio", label: "Ohio" },
  { value: "georgia", label: "Georgia" },
  { value: "north-carolina", label: "North Carolina" },
  { value: "michigan", label: "Michigan" },
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
  return (
    <div className="flex flex-col gap-4">
      <Select
        label="State"
        hint="More states arrive with the state tax rates."
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
        hint="Total for a year. Not counted yet."
        error={errors.otherDeductions}
        locale={info.locale}
        currency={info.currency}
        value={values.otherDeductions ? Number(values.otherDeductions) : null}
        onValueChange={(n) => onChange("otherDeductions", n === null ? "" : String(n))}
      />
    </div>
  );
}
