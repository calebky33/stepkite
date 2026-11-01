import { LegalPage } from "@/components/shell/LegalPage";

import { SITE_URL, stubMetadata } from "@/lib/seo";

// Draft text: noindex until it is final.
export const metadata = stubMetadata({
  alternates: { canonical: `${SITE_URL}/privacy` },
  title: "Privacy",
  description: "What Stepkite keeps, where it stays, and how to delete it.",
});

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy"
      lead="Short version: the calculators run on your device. Everything else is tied to your account."
      sections={[
        {
          heading: "What stays on your device",
          paragraphs: [
            "The salary calculators work out your result in your browser. The salary you type is not sent to us.",
            "If you build a CV before signing up (soft-start sandbox), your draft is kept in your browser only. When you sign up, the draft moves onto your account.",
            "The job tracker runs in your browser. Pro accounts sync a copy to our server; free accounts stay local only.",
          ],
        },
        {
          heading: "What we store when you sign up",
          paragraphs: [
            "We store your email address, a hashed password or an OAuth identifier (Google or LinkedIn), the plan you are on, and the CVs and jobs you choose to save.",
            "During the seven-day free trial we also store an anonymised browser fingerprint and a hashed IP address. We use these only to stop the same person starting more than one free trial.",
            "If you pay, Stripe handles your card details. We keep a record that a charge happened, the amount and the date, not your card number.",
          ],
        },
        {
          heading: "What we never log",
          paragraphs: [
            "We never log the salary you type, the body of your CV, the body of your job notes, your card number, or your password.",
          ],
        },
        {
          heading: "AI features",
          paragraphs: [
            "The AI matcher only rewrites lines you have written. The text you select is sent to our language model provider and discarded after the response is returned.",
            "You approve every change the matcher suggests before it reaches your CV.",
          ],
        },
        {
          heading: "Ads",
          paragraphs: [
            "Free pages (the calculators, the guides, and the free CV builder sidebar) may show ads. Pro and trial accounts see no ads anywhere.",
            "Ads are off until you accept the optional cookies prompt. If you decline, no ads are loaded.",
          ],
        },
        {
          heading: "Who we share with",
          paragraphs: [
            "Our hosting is Cloudflare Workers. Our account and sync database is Supabase. Payments are Stripe. OAuth sign-in uses Google or LinkedIn. We do not sell your data.",
            "If an ad network is added, the exact provider will be named here before it goes live.",
          ],
        },
        {
          heading: "Deleting your data",
          paragraphs: [
            "The account page lets you delete your account. Your CVs, saved jobs and profile are removed within 30 days. Payment records are kept for the time required by tax law and anonymised after.",
            "Data stored only on your device goes when you clear this site's data in your browser.",
          ],
        },
        {
          heading: "Questions",
          paragraphs: [
            "Support is still being set up. The contact page will show how to reach us once it is ready.",
          ],
        },
      ]}
    />
  );
}
