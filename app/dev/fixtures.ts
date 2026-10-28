// Dev-only fixtures for the component gallery (break-ui skill). Worst case values are
// realistic: long but believable labels, the real salary cap from docs, long region names.
export type GalleryData = {
  button: [string, string, string];
  input: { label: string; value: string; hint: string };
  inputError: { label: string; value: string; error: string };
  badges: [string, string];
  controls: {
    selectLabel: string;
    regions: string[];
    segmentLabel: string;
    sliderLabel: string;
    switchLabel: string;
    switchHint: string;
    dialogTitle: string;
    dialogBody: string;
    toastTitle: string;
    toastBody: string;
    tooltip: string;
    tabs: [string, string];
    steps: string[];
    rows: Array<[string, string]>;
  };
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
  controls: {
    selectLabel: "Region",
    regions: ["England", "Scotland", "Wales"],
    segmentLabel: "Pay period",
    sliderLabel: "Annual salary",
    switchLabel: "Include pension",
    switchHint: "Takes 5 percent from your pay.",
    dialogTitle: "Reset all fields",
    dialogBody: "This clears your salary and region.",
    toastTitle: "Saved on this device.",
    toastBody: "Your figures stay on this device.",
    tooltip: "Move this section up",
    tabs: ["Summary", "Breakdown"],
    steps: ["Basics", "Work", "Skills", "Download"],
    rows: [
      ["Income tax", "3,486"],
      ["National Insurance", "1,394"],
      ["Take-home pay", "23,120"],
    ],
  },
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
  controls: {
    selectLabel: "Region where you do most of your work, including remote and hybrid days",
    regions: [
      "England, including the Isle of Wight and the Isles of Scilly",
      "Scotland, Orkney and Shetland",
      "Wales",
    ],
    segmentLabel: "How often you are paid, as shown on your payslip",
    sliderLabel: "Annual salary before tax, including bonus, overtime and any taxable benefits",
    switchLabel: "Include workplace pension contributions taken through salary sacrifice",
    switchHint: "Turn this on only if your payslip shows a pension line taken before tax is worked out.",
    dialogTitle: "Reset all fields and start again from the salary question",
    dialogBody:
      "This clears your salary, region, pension and student loan choices. Nothing is saved anywhere else, so you will need to enter them again.",
    toastTitle: "Your figures are saved on this device and will stay here until you clear them",
    toastBody: "Nothing leaves your browser unless you sign in and turn on sync in your settings.",
    tooltip: "Move this section above the one before it in your CV",
    tabs: ["Summary of your take-home pay", "Full breakdown by tax band"],
    steps: [
      "Personal details",
      "Work history and achievements",
      "Skills and certifications",
      "Download your CV",
    ],
    rows: [
      ["Income tax at the higher rate on earnings above the basic rate limit", "9,999,999"],
      ["Employee National Insurance contributions", "0"],
      ["averyveryverylongunbrokenlabelwithnospacesatalltotestwrapping", "1"],
    ],
  },
};
