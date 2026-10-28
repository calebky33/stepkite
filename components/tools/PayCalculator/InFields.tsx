"use client";

import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Select } from "@/components/ui/Select";
import { COUNTRY_INFO } from "@/lib/countries";
import type { FieldsProps } from "./fieldTypes";

/** Placeholder list for professional tax. The full list arrives with the state rates. */
const STATES = [
  { value: "maharashtra", label: "Maharashtra" },
  { value: "karnataka", label: "Karnataka" },
  { value: "delhi", label: "Delhi" },
  { value: "tamil-nadu", label: "Tamil Nadu" },
  { value: "telangana", label: "Telangana" },
  { value: "gujarat", label: "Gujarat" },
  { value: "west-bengal", label: "West Bengal" },
];

const info = COUNTRY_INFO.in;

export function InFields({ values, errors, onChange }: FieldsProps) {
  const oldRegime = values.regime === "old";
  const amount = (key: string) => (values[key] ? Number(values[key]) : null);
  const setAmount = (key: string) => (n: number | null) =>
    onChange(key, n === null ? "" : String(n));

  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl
        label="Tax regime"
        hint="The new regime is the default. Pick the old one to add deductions."
        value={oldRegime ? "old" : "new"}
        onValueChange={(v) => onChange("regime", v)}
        options={[
          { value: "new", label: "New regime" },
          { value: "old", label: "Old regime" },
        ]}
      />
      <Select
        label="State"
        hint="Professional tax depends on your state."
        options={STATES}
        value={values.region}
        onValueChange={(v) => onChange("region", v)}
      />
      <p className="rounded-input bg-surface-2 p-3 text-sm text-muted">
        We assume the standard provident fund deduction from your basic pay. The exact rate
        appears once it is checked.
      </p>
      {oldRegime ? (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <CurrencyInput
              label="Section 80C investments"
              hint="PPF, ELSS, life insurance and similar, in a year."
              error={errors.section80c}
              locale={info.locale}
              currency={info.currency}
              value={amount("section80c")}
              onValueChange={setAmount("section80c")}
            />
            <CurrencyInput
              label="Section 80D health insurance"
              hint="Premiums you pay in a year."
              error={errors.section80d}
              locale={info.locale}
              currency={info.currency}
              value={amount("section80d")}
              onValueChange={setAmount("section80d")}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <CurrencyInput
              label="HRA you receive"
              hint="Shown on your payslip. Not counted yet."
              error={errors.hraReceived}
              locale={info.locale}
              currency={info.currency}
              value={amount("hraReceived")}
              onValueChange={setAmount("hraReceived")}
            />
            <CurrencyInput
              label="Rent you pay"
              hint="Total rent for the year. Not counted yet."
              error={errors.rentPaid}
              locale={info.locale}
              currency={info.currency}
              value={amount("rentPaid")}
              onValueChange={setAmount("rentPaid")}
            />
          </div>
          <SegmentedControl
            label="City you live in"
            hint="Metro status changes how HRA is worked out."
            value={values.metro === "other" ? "other" : "metro"}
            onValueChange={(v) => onChange("metro", v)}
            options={[
              { value: "metro", label: "Metro" },
              { value: "other", label: "Other" },
            ]}
          />
        </div>
      ) : null}
    </div>
  );
}
