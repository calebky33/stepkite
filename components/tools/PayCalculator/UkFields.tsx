"use client";

import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { COUNTRY_INFO } from "@/lib/countries";
import type { FieldsProps } from "./fieldTypes";

const info = COUNTRY_INFO.uk;

const REGIONS = [
  { value: "england", label: "England" },
  { value: "wales", label: "Wales" },
  { value: "northern-ireland", label: "Northern Ireland" },
  { value: "scotland", label: "Scotland" },
];

const PENSION_TYPES = [
  { value: "net-pay", label: "Net pay arrangement" },
  { value: "relief-at-source", label: "Relief at source" },
  { value: "salary-sacrifice", label: "Salary sacrifice" },
];

const STUDENT_LOANS = [
  { value: "none", label: "No student loan" },
  { value: "plan-1", label: "Plan 1" },
  { value: "plan-2", label: "Plan 2" },
  { value: "plan-4", label: "Plan 4" },
  { value: "plan-5", label: "Plan 5" },
  { value: "postgraduate", label: "Postgraduate loan" },
];

export function UkFields({ values, errors, onChange }: FieldsProps) {
  return (
    <div className="flex flex-col gap-4">
      <Select
        label="Where you work"
        hint="Scotland has its own income tax bands."
        options={REGIONS}
        value={values.region}
        onValueChange={(v) => onChange("region", v)}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Pension contribution"
          hint="A percentage of your salary. Leave blank for none."
          error={errors.pensionPercent}
          inputMode="decimal"
          autoComplete="off"
          value={values.pensionPercent ?? ""}
          onChange={(e) => onChange("pensionPercent", e.target.value)}
        />
        <Select
          label="How your pension is taken"
          hint="Your payslip or employer will say which."
          options={PENSION_TYPES}
          value={values.pensionType}
          onValueChange={(v) => onChange("pensionType", v)}
        />
      </div>
      <Select
        label="Student loan"
        hint="Pick the plan on your loan letter."
        options={STUDENT_LOANS}
        value={values.studentLoan}
        onValueChange={(v) => onChange("studentLoan", v)}
      />
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
