import type { CountryCode } from "@/lib/countries";

export interface Guide {
  slug: string;
  country: CountryCode;
  title: string;
  /** One real problem, in the first line of the page. */
  summary: string;
  paragraphs: readonly string[];
  /** The one tool this guide ends on. */
  next: { label: string; path: "salary-calculator" | "cv" | "tracker" };
}

/** Placeholder guides. Every one is a draft for a person to rewrite before it is indexed. */
export const GUIDES: readonly Guide[] = [
  {
    slug: "cv-photo",
    country: "uk",
    title: "Should your UK CV have a photo?",
    summary: "You are about to add a headshot to your CV and wonder if it will help or hurt.",
    paragraphs: [
      "Most UK employers do not expect a photo on a CV, and some recruiters prefer none so they judge your experience first.",
      "A person will check this guide against current careers service advice and add sources before it is published.",
      "Until then, leave the photo off and spend the space on results from your last two roles.",
    ],
    next: { label: "Start your CV", path: "cv" },
  },
  {
    slug: "resume-length",
    country: "us",
    title: "How long should your résumé be?",
    summary: "Your résumé runs onto a second page and you are not sure what to cut.",
    paragraphs: [
      "A résumé that gives old roles as much room as recent ones hides the work you most want read.",
      "A person will check this guide against current careers service advice and add sources before it is published.",
      "Until then, cut anything older than your last three roles to a single line.",
    ],
    next: { label: "Start your résumé", path: "cv" },
  },
  {
    slug: "ctc-to-in-hand",
    country: "in",
    title: "Why your in-hand salary is lower than your CTC",
    summary: "Your offer letter says one number and your first payslip shows a smaller one.",
    paragraphs: [
      "CTC is the full cost of you to the employer. It can include contributions and benefits that never reach your bank account.",
      "A person will check this guide against the official rules and add sources before it is published.",
      "Until then, ask your employer for the monthly salary structure and compare it with your CTC.",
    ],
    next: { label: "Check your in-hand salary", path: "salary-calculator" },
  },
];

export function guidesFor(country: CountryCode): Guide[] {
  return GUIDES.filter((g) => g.country === country);
}

export function findGuide(country: CountryCode, slug: string): Guide | undefined {
  return GUIDES.find((g) => g.country === country && g.slug === slug);
}
