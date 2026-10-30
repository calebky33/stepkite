import type { CountryCode } from "@/lib/countries";

export type Faq = { question: string; answer: string };

export type SalaryCalculatorContent = {
  title: string;
  description: string;
  h1: string;
  intro: string;
  faqs: readonly Faq[];
};

/** One source for the visible FAQ and the FAQPage JSON-LD. No tax figures in copy: the calculator shows them from the rates file. */
export const SALARY_CONTENT: Partial<Record<CountryCode, SalaryCalculatorContent>> = {
  uk: {
    title: "UK salary calculator: take-home pay",
    description:
      "Work out your UK take-home pay after Income Tax, National Insurance, pension and student loan. Free to use, with figures checked against GOV.UK.",
    h1: "UK salary calculator",
    intro: "Enter your salary to see your take-home pay. Nothing you type leaves this device.",
    faqs: [
      {
        question: "Where do the figures come from?",
        answer:
          "From GOV.UK pages on Income Tax and National Insurance. The result shows the tax year and the date we last checked them against the official source.",
      },
      {
        question: "Why is my payslip different?",
        answer:
          "Your tax code, the way your employer takes pension contributions, benefits in kind and other income can all change the figure. This is an estimate, so your payslip is the final word.",
      },
      {
        question: "Does Scotland use different rates?",
        answer:
          "Yes. Income Tax is set separately in Scotland. Pick your nation in the calculator and it uses the right bands.",
      },
      {
        question: "Does it include student loan and pension?",
        answer:
          "Yes, if you choose them. Select your student loan plan and enter your pension contribution to see how each changes your take-home pay.",
      },
      {
        question: "Is my salary stored anywhere?",
        answer: "No. The sum runs in your browser, and your salary never goes to a server.",
      },
    ],
  },
};
