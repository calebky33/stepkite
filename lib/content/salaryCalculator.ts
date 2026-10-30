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
  in: {
    title: "India salary calculator: CTC to in-hand pay",
    description:
      "Work out your monthly in-hand pay from your CTC or LPA, under the old or new tax regime. Free, with figures checked against official sources.",
    h1: "India salary calculator",
    intro:
      "Enter your CTC to see your in-hand pay. Switch between the old and new regime to see the difference. Nothing you type leaves this device.",
    faqs: [
      {
        question: "Where do the figures come from?",
        answer:
          "From the Income Tax Department of India. Your result shows the financial year and the date we last checked the figures.",
      },
      {
        question: "What is the difference between CTC and in-hand pay?",
        answer:
          "CTC is the total your employer spends on you in a year. In-hand pay is what reaches your bank account each month, after tax and deductions such as provident fund. Employer contributions and bonuses paid later are part of CTC but not of your monthly in-hand pay.",
      },
      {
        question: "Should I choose the old or the new regime?",
        answer:
          "It depends on your deductions. Switch between the two regimes in the calculator and compare the in-hand pay. Your payslip follows the regime you chose with your employer.",
      },
      {
        question: "How do I enter an LPA figure?",
        answer:
          "LPA is lakh per annum, so 12 LPA is 12 lakh a year. Type the full amount in rupees, for example 12,00,000. The commas appear as you type.",
      },
      {
        question: "Why is my payslip different?",
        answer:
          "Your salary structure, variable pay, perquisites, employer provident fund and other income can all change the figure. This is an estimate, so your payslip is the final word.",
      },
      {
        question: "What are the financial year and assessment year?",
        answer:
          "The financial year is when you earn the income. The assessment year is the one after, when you file the return for it. Your result says which financial year the figures are for.",
      },
      {
        question: "Is my salary stored anywhere?",
        answer: "No. The sum runs in your browser. Your salary never goes to a server.",
      },
    ],
  },
};
