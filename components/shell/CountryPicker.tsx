"use client";

import { Select } from "@/components/ui/Select";
import { COUNTRIES, COUNTRY_INFO, type CountryCode } from "@/lib/countries";

const OPTIONS = COUNTRIES.map((code) => ({ value: code, label: COUNTRY_INFO[code].name })).sort(
  (a, b) => a.label.localeCompare(b.label, "en"),
);

/** Picks a market from the registry. Used on the sign-up page and in account settings. */
export function CountryPicker({
  value,
  onChange,
  label = "Your country",
  hint,
  disabled,
}: {
  value: CountryCode;
  onChange: (code: CountryCode) => void;
  label?: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <Select
      label={label}
      hint={hint}
      options={OPTIONS}
      value={value}
      disabled={disabled}
      onValueChange={(next) => {
        const match = COUNTRIES.find((code) => code === next);
        if (match) onChange(match);
      }}
    />
  );
}
