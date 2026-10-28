import { LegalPage } from "@/components/shell/LegalPage";

import { SITE_URL, stubMetadata } from "@/lib/seo";

// Draft text: noindex until it is final.
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
            "Your CV and job notes belong to you. We do not claim any rights over them.",
            "You are responsible for what your CV says. Keep it true.",
          ],
        },
        {
          heading: "The Pro Pass",
          paragraphs: [
            "The Pro Pass is a one-time payment that lasts 30 days. It does not renew by itself.",
            "An annual plan is a separate choice. It renews each year until you cancel, and you can cancel from your account.",
          ],
        },
        {
          heading: "Using the site",
          paragraphs: [
            "Don't misuse the site, try to break it, or collect data from it in bulk.",
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
