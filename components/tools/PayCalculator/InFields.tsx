"use client";

import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Select } from "@/components/ui/Select";
import { COUNTRY_INFO } from "@/lib/countries";
import type { FieldsProps } from "./fieldTypes";

/** All 28 states and 8 union territories, by name. The value is the key the engine reads. */
export const STATES = [
  { value: "andaman-and-nicobar-islands", label: "Andaman and Nicobar Islands" },
  { value: "andhra-pradesh", label: "Andhra Pradesh" },
  { value: "arunachal-pradesh", label: "Arunachal Pradesh" },
  { value: "assam", label: "Assam" },
  { value: "bihar", label: "Bihar" },
  { value: "chandigarh", label: "Chandigarh" },
  { value: "chhattisgarh", label: "Chhattisgarh" },
  { value: "dadra-and-nagar-haveli-and-daman-and-diu", label: "Dadra and Nagar Haveli and Daman and Diu" },
  { value: "delhi", label: "Delhi" },
  { value: "goa", label: "Goa" },
  { value: "gujarat", label: "Gujarat" },
  { value: "haryana", label: "Haryana" },
  { value: "himachal-pradesh", label: "Himachal Pradesh" },
  { value: "jammu-and-kashmir", label: "Jammu and Kashmir" },
  { value: "jharkhand", label: "Jharkhand" },
  { value: "karnataka", label: "Karnataka" },
  { value: "kerala", label: "Kerala" },
  { value: "ladakh", label: "Ladakh" },
  { value: "lakshadweep", label: "Lakshadweep" },
  { value: "madhya-pradesh", label: "Madhya Pradesh" },
  { value: "maharashtra", label: "Maharashtra" },
  { value: "manipur", label: "Manipur" },
  { value: "meghalaya", label: "Meghalaya" },
  { value: "mizoram", label: "Mizoram" },
  { value: "nagaland", label: "Nagaland" },
  { value: "odisha", label: "Odisha" },
  { value: "puducherry", label: "Puducherry" },
  { value: "punjab", label: "Punjab" },
  { value: "rajasthan", label: "Rajasthan" },
  { value: "sikkim", label: "Sikkim" },
  { value: "tamil-nadu", label: "Tamil Nadu" },
  { value: "telangana", label: "Telangana" },
  { value: "tripura", label: "Tripura" },
  { value: "uttar-pradesh", label: "Uttar Pradesh" },
  { value: "uttarakhand", label: "Uttarakhand" },
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
        hint="Professional tax is only included for Telangana so far. Other states pay none in this estimate."
        options={STATES}
        value={values.region}
        onValueChange={(v) => onChange("region", v)}
      />
      <p className="rounded-input bg-surface-2 p-3 text-sm text-muted">
        We take provident fund as 12% of your basic pay, with no wage cap. We assume basic pay is
        half of your CTC.
      </p>
      <CurrencyInput
        label="Other deductions"
        hint="Total for a year. We don't take this off your pay yet."
        error={errors.otherDeductions}
        locale={info.locale}
        currency={info.currency}
        value={amount("otherDeductions")}
        onValueChange={setAmount("otherDeductions")}
      />
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
              hint="Total HRA for the year, from your payslip. Used under the old regime."
              error={errors.hraReceived}
              locale={info.locale}
              currency={info.currency}
              value={amount("hraReceived")}
              onValueChange={setAmount("hraReceived")}
            />
            <CurrencyInput
              label="Rent you pay"
              hint="Total rent for the year. Used under the old regime."
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
