import { LegalPage } from "@/components/shell/LegalPage";

export const metadata = {
  title: "Privacy",
  description: "What Stepkite keeps, where it stays, and how to delete it.",
};

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy"
      lead="Short version: the salary you type and the CV you write stay on your device."
      sections={[
        {
          heading: "What stays on your device",
          paragraphs: [
            "The calculators work out your result in your browser. The salary you type is not sent to us.",
            "The CV builder and the job tracker store their data in your browser. We cannot see it.",
          ],
        },
        {
          heading: "What we keep if you sign in",
          paragraphs: [
            "If you create an account and turn on sync, we store your email address, your CVs and your saved jobs so they appear on your other devices.",
            "If you buy the Pro Pass, our payment provider Stripe handles your card details. We keep a record that you paid, not your card number.",
          ],
        },
        {
          heading: "Cookies and measurement",
          paragraphs: [
            "Optional cookies for page statistics and ads are off until you accept them. See the cookies page for the full list.",
            "We never record the salary you type.",
          ],
        },
        {
          heading: "Deleting your data",
          paragraphs: [
            "When you are signed in, the account page lets you delete your account. Your CVs, saved jobs and profile are removed with it.",
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
