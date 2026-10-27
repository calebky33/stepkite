// Dev-only fixtures for the component gallery (break-ui skill). Worst case values are
// realistic: long but believable labels, the real salary cap from docs, long region names.
export type GalleryData = {
  button: [string, string, string];
  input: { label: string; value: string; hint: string };
  inputError: { label: string; value: string; error: string };
  badges: [string, string];
};

export const demo: GalleryData = {
  button: ["Calculate", "Compare", "Reset"],
  input: { label: "Annual salary", value: "28,000", hint: "Before tax" },
  inputError: {
    label: "Annual salary",
    value: "abc",
    error: "Enter a number, for example 28,000.",
  },
  badges: ["2026 to 2027", "Scotland"],
};

export const worst: GalleryData = {
  button: [
    "Compare this offer with my current salary and region",
    "Reset all fields and start again",
    "Reset",
  ],
  input: {
    label: "Annual salary before tax, including bonus, overtime and any taxable benefits",
    value: "9,999,999",
    hint: "Enter your gross pay for the full tax year. Do not include pension payments taken by salary sacrifice.",
  },
  inputError: {
    label: "Annual salary",
    value: "£28,000,000,000 per year",
    error: "Enter a salary between £1 and £10,000,000. Remove letters, symbols and spaces.",
  },
  badges: [
    "Scotland, Wales and Northern Ireland use different income tax rates",
    "2026 to 2027 tax year, estimate only",
  ],
};
