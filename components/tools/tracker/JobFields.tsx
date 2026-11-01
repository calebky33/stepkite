"use client";

import { Input } from "@/components/ui/Input";
import type { CountryCode } from "@/lib/countries";
import { NativeSelect, TextArea } from "./fields";
import type { JobErrors, JobValues, Period } from "./jobForm";

type Props = {
  values: JobValues;
  errors: JobErrors;
  onChange: (patch: Partial<JobValues>) => void;
  /** The link field sits elsewhere, as in "Read the link". */
  hideUrl?: boolean;
  /** The notes field sits elsewhere, as in "Paste job text". */
  hideNotes?: boolean;
  /** When set, a salary figure links to the pay calculator for this country. */
  country?: CountryCode;
};

const PERIODS: readonly { value: Period; label: string }[] = [
  { value: "annual", label: "Annual" },
  { value: "monthly", label: "Monthly" },
  { value: "weekly", label: "Weekly" },
];

const CURRENCIES = ["GBP", "USD", "INR"];

/** Title, company and link. Every job needs these. */
export function MainFields({ values, errors, onChange, hideUrl }: Props) {
  return (
    <div
      className={
        hideUrl ? "grid gap-4 md:grid-cols-2 md:gap-6" : "grid gap-4 md:grid-cols-3 md:gap-6"
      }
    >
      <Input
        label="Job title"
        value={values.title}
        error={errors.title}
        onChange={(e) => onChange({ title: e.target.value })}
      />
      <Input
        label="Company"
        value={values.company}
        error={errors.company}
        onChange={(e) => onChange({ company: e.target.value })}
      />
      {hideUrl ? null : (
        <Input
          label="Link to the job ad"
          type="url"
          inputMode="url"
          hint="Optional. Paste the full link."
          value={values.url}
          error={errors.url}
          onChange={(e) => onChange({ url: e.target.value })}
        />
      )}
    </div>
  );
}

/** Everything else about a job. All of it is optional. */
export function DetailFields({ values, errors, onChange, hideNotes, country }: Props) {
  const figure = Number(values.salaryMin.replace(/,/g, "").trim());
  const takeHomeHref =
    country && values.salaryMin.trim() !== "" && Number.isFinite(figure) && figure > 0
      ? `/${country}/salary-calculator?gross=${encodeURIComponent(String(figure))}&period=${values.period}`
      : null;
  const currencies = CURRENCIES.includes(values.currency)
    ? CURRENCIES
    : [...CURRENCIES, values.currency];
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Location"
          value={values.location}
          error={errors.location}
          onChange={(e) => onChange({ location: e.target.value })}
        />
        <Input
          label="Where you found it"
          hint="For example a job board, a friend or the company site."
          value={values.source}
          error={errors.source}
          onChange={(e) => onChange({ source: e.target.value })}
        />
      </div>
      <fieldset className="grid min-w-0 gap-4 md:grid-cols-4">
        <legend className="mb-1 text-sm font-semibold">Pay</legend>
        <NativeSelect
          label="Currency"
          value={values.currency}
          options={currencies.map((c) => ({ value: c, label: c }))}
          onChange={(e) => onChange({ currency: e.target.value })}
        />
        <Input
          label="Lowest figure"
          inputMode="decimal"
          value={values.salaryMin}
          error={errors.salaryMin}
          onChange={(e) => onChange({ salaryMin: e.target.value })}
        />
        <Input
          label="Highest figure"
          inputMode="decimal"
          value={values.salaryMax}
          error={errors.salaryMax}
          onChange={(e) => onChange({ salaryMax: e.target.value })}
        />
        <NativeSelect
          label="Paid"
          value={values.period}
          options={PERIODS}
          onChange={(e) => onChange({ period: e.target.value as Period })}
        />
        {takeHomeHref ? (
          <a
            href={takeHomeHref}
            className="inline-flex min-h-11 items-center text-sm underline underline-offset-4 md:col-span-4"
          >
            What you take home
          </a>
        ) : null}
      </fieldset>
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Next step"
          hint="For example, send a follow-up email."
          value={values.nextStep}
          error={errors.nextStep}
          onChange={(e) => onChange({ nextStep: e.target.value })}
        />
        <Input
          label="Next step date"
          type="datetime-local"
          value={values.nextStepDue}
          error={errors.nextStepDue}
          onChange={(e) => onChange({ nextStepDue: e.target.value })}
        />
      </div>
      <Input
        label="Date applied"
        type="date"
        hint="Leave empty until you apply. Moving a job to Applied fills it in."
        value={values.appliedAt}
        error={errors.appliedAt}
        onChange={(e) => onChange({ appliedAt: e.target.value })}
      />
      {hideNotes ? null : (
        <TextArea
          label="Notes"
          value={values.notes}
          error={errors.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
        />
      )}
    </div>
  );
}
