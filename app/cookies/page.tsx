import { LegalPage } from "@/components/shell/LegalPage";

import { SITE_URL, stubMetadata } from "@/lib/seo";

// Draft text: noindex until it is final.
export const metadata = stubMetadata({
  alternates: { canonical: `${SITE_URL}/cookies` },
  title: "Cookies",
  description: "Which cookies and browser storage Stepkite uses, and how to change your choice.",
});

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookies"
      lead="What we store in your browser, and what we ask first."
      sections={[
        {
          heading: "Your choice",
          paragraphs: [
            "We keep one small cookie, called sk_consent, that remembers whether you accepted or declined optional cookies. It lasts one year.",
            "Until you choose, we set no optional cookies. If you decline, nothing optional is set. To change your mind, delete the cookie in your browser and the question comes back.",
          ],
        },
        {
          heading: "Cookies that are always on",
          paragraphs: [
            "The sign-in cookie, set by our account provider Supabase, keeps you signed in. It lasts for the length of your session.",
            "The CSRF token cookie protects form posts from being made from other sites.",
            "If you buy a plan, Stripe sets its own cookies on its checkout page while you pay.",
            "These are needed for the job, so they don't wait for your choice.",
          ],
        },
        {
          heading: "Optional cookies",
          paragraphs: [
            "Ads: our ad provider sets cookies to work out which ads to show on the free pages. They load only if you accept.",
            "Page statistics: a privacy-light stats provider counts page views to tell us which pages are popular. It loads only if you accept.",
          ],
        },
        {
          heading: "Browser storage that is not a cookie",
          paragraphs: [
            "Your theme choice (system, light or dark) is saved in your browser's local storage. It never leaves your device.",
            "Anonymous CV drafts (before you sign up) are kept in your browser's local storage. When you sign up, the draft moves onto your account.",
            "The job tracker and signed-in CV builder keep a copy in your browser's IndexedDB so they work offline. Pro accounts also sync a copy to our server.",
          ],
        },
      ]}
    />
  );
}
