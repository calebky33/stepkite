import { LegalPage } from "@/components/shell/LegalPage";

export const metadata = {
  title: "Cookies",
  description: "Which cookies and browser storage Stepkite uses, and how to change your choice.",
};

export default function Cookies() {
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
          heading: "Browser storage that is not a cookie",
          paragraphs: [
            "Your theme choice (system, light or dark) is saved in your browser's local storage. It never leaves your device.",
            "The CV builder and the job tracker save their data in your browser too.",
          ],
        },
        {
          heading: "Optional cookies",
          paragraphs: [
            "Page statistics and ads are the two optional kinds. Neither is switched on yet. If we add them, they will load only after you accept.",
          ],
        },
        {
          heading: "Cookies from signing in and paying",
          paragraphs: [
            "If you sign in, our account provider sets a cookie that keeps you signed in. If you pay, Stripe sets cookies on its own checkout page. These are needed for the job, so they don't wait for your choice.",
          ],
        },
      ]}
    />
  );
}
