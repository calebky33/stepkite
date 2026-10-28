import type { CountryCode } from "@/lib/countries";
import type { Cv } from "./schema";

const CITY: Record<CountryCode, string> = { uk: "Leeds", us: "Austin", in: "Pune" };

/**
 * A made-up person shown in the preview until the user types. The page is labelled "Example"
 * wherever it appears. It is never saved and never used for anything else.
 */
export function exampleCv(base: Cv): Cv {
  return {
    ...base,
    contact: {
      fullName: "Sam Example",
      email: "sam.example@example.com",
      phone: "",
      city: CITY[base.country],
      links: [],
    },
    summary:
      "Operations coordinator who plans deliveries, keeps suppliers on schedule and writes clear handover notes.",
    experience: [
      {
        id: "example-job-1",
        role: "Operations coordinator",
        employer: "Northfield Supplies",
        location: CITY[base.country],
        start: "2021-03",
        end: null,
        bullets: [
          "Plan weekly deliveries for the regional depot.",
          "Agree dates with suppliers and chase late orders.",
          "Write the handover notes for each shift.",
        ],
      },
      {
        id: "example-job-2",
        role: "Warehouse assistant",
        employer: "Harbour Goods",
        location: CITY[base.country],
        start: "2018-06",
        end: "2021-02",
        bullets: ["Picked and packed orders.", "Trained two new starters on the scanning system."],
      },
    ],
    education: [
      {
        id: "example-edu-1",
        qualification: "Diploma in business administration",
        institution: "City College",
        start: "2015-09",
        end: "2018-06",
        details: "",
      },
    ],
    skills: [
      {
        id: "example-skills-1",
        label: "Skills",
        items: ["Scheduling", "Supplier contact", "Stock counts", "Spreadsheets"],
      },
    ],
  };
}
