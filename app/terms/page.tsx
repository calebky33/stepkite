import { LegalPage } from "@/components/shell/LegalPage";

import { SITE_URL, stubMetadata } from "@/lib/seo";

// Draft text: noindex until it is final. The last section is still open.
export const metadata = stubMetadata({
  alternates: { canonical: `${SITE_URL}/terms` },
  title: "Terms of use",
  description: "The plain rules for using Stepkite, including what the estimates are and are not.",
});

export default function Terms() {
  return (
    <LegalPage
      title="Terms of use"
      lead="The rules for using Stepkite, in plain words."
      sections={[
        {
          heading: "Estimates, not advice",
          paragraphs: [
            "The calculators give estimates. Your payslip may differ because of other income, your tax code, pension choices and other things we cannot see.",
            "Nothing here is tax, legal or financial advice. Check important decisions with the official tax body or a qualified adviser.",
          ],
        },
        {
          heading: "Your content",
          paragraphs: [
            "Your CV, your notes, and the jobs you track belong to you. We do not claim any rights over them.",
            "You are responsible for what your CV says. Keep it true.",
          ],
        },
        {
          heading: "Account",
          paragraphs: [
            "To save your work on our servers, build a CV, or track jobs, you create an account with your email, with Google, or with LinkedIn. One account per person.",
            "You can delete your account at any time from the account page. Your CVs, saved jobs and profile go with it.",
          ],
        },
        {
          heading: "Free, trial and paid plans",
          paragraphs: [
            "The free plan lets you build and preview your CV, save three CVs, and export a watermarked PDF of one ATS-safe template. We may show ads on free pages.",
            "A seven-day free trial gives you every Pro feature. No card is needed to start the trial. On day eight the trial ends and your account drops back to free unless you pick a paid plan.",
            "Pro plans are $9.99 per month, $39 per year, or $149 one-time (lifetime). The monthly and yearly plans renew by themselves until you cancel. The lifetime plan does not renew.",
            "Every price surface shows the next renewal amount and date. The pricing page and the account page show your current plan, your next charge, and a Cancel button.",
          ],
        },
        {
          heading: "Cancellation and refunds",
          paragraphs: [
            "Cancel is one click on the account page. Your access runs to the end of the paid period, then revokes.",
            "Fourteen-day money-back on yearly and lifetime, no questions, if asked within the window. Monthly plans cancel at the end of the current period, no partial refunds. The seven-day trial charges nothing, so there is nothing to refund.",
          ],
        },
        {
          heading: "Using the site",
          paragraphs: [
            "Don't misuse the site, try to break it, or collect data from it in bulk.",
            "One free trial per person. Do not reuse email addresses, fingerprints or payment methods to start a second trial.",
            "We may change or stop a tool. If that affects something you paid for, we will say so and sort it out fairly.",
          ],
        },
        {
          heading: "Liability and governing law",
          paragraphs: [
            "These parts are still to be written with a lawyer. This draft does not settle them.",
          ],
        },
      ]}
    />
  );
}
