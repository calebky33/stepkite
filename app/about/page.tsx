import Link from "next/link";
import { PageShell } from "@/components/shell/PageShell";

import { SITE_URL } from "@/lib/seo";

export const metadata = {
  alternates: { canonical: `${SITE_URL}/about` },
  title: "About Stepkite",
  description:
    "Stepkite builds pay calculators, a CV builder and a job tracker that follow the rules of the country you work in.",
};

const link = "text-primary underline-offset-4 hover:underline";

export default function About() {
  return (
    <PageShell
      title="About Stepkite"
      lead="Stepkite helps you work out your pay and apply for jobs, using the rules of the country you work in."
      narrow
    >
      <div className="flex flex-col gap-4 text-base">
        <h2 className="font-display text-2xl">What Stepkite is</h2>
        <p>
          Stepkite is a set of career tools that change with the country. You get a take-home pay
          calculator, a CV builder and a job tracker. We are starting with the United Kingdom, the
          United States and India.
        </p>
        <p>
          The three tools work as one line. You check what a job pays after tax, build a CV that
          fits local expectations, then keep track of where you have applied.
        </p>

        <h2 className="mt-4 font-display text-2xl">Why we built it</h2>
        <p>
          Most pay calculators and CV tools treat every country the same. They are not the same. A
          UK payslip talks about National Insurance and tax codes. A US paycheck has federal and
          state tax, plus Social Security and Medicare. An Indian offer letter talks about CTC and
          in-hand salary. A UK CV leaves out a photo, and a US résumé usually stays on one page.
        </p>
        <p>
          We wanted one place that gets those details right, so you do not have to translate advice
          written for somewhere else.
        </p>

        <h2 className="mt-4 font-display text-2xl">How it works</h2>
        <p>
          <strong>Free.</strong> The calculators are free to use and run in your browser, so the
          salary you type is not sent to us. You can also start a CV and a tracker without an
          account. Anything you make is saved on your device.
        </p>
        <p>
          <strong>Pro trial.</strong> If you want the extra tools, such as matching your CV to a job
          ad, you can start a free trial. See the{" "}
          <Link href="/pricing" className={link}>
            pricing page
          </Link>{" "}
          for the current terms.
        </p>
        <p>
          <strong>Pro.</strong> Pro is for people who want those extra tools and syncing across
          devices. The price and length are shown before you pay, and the pricing page is always the
          place to check them.
        </p>

        <h2 className="mt-4 font-display text-2xl">Our rules</h2>
        <ul className="flex list-disc flex-col gap-2 pl-6">
          <li>
            Honest prices. We show what you pay and for how long before you pay it. No hidden
            renewals.
          </li>
          <li>
            Your data is yours. Your CV stays on your device unless you sign in and turn on sync.
            You can delete your account data yourself from the account page.
          </li>
          <li>
            No fake stats. We do not invent user counts, testimonials, vacancies or success rates.
          </li>
          <li>
            Official sources. Every tax figure shows where it came from and when we last checked it.
            If we have not checked a rate yet, we show nothing instead of a guess.
          </li>
          <li>
            Your words stay yours. When the job matcher suggests changes, it only rewords your real
            experience, and you approve every line.
          </li>
        </ul>
        <p>
          Calculators give estimates. Your payslip, your employer and your tax authority have the
          final say.
        </p>

        <h2 className="mt-4 font-display text-2xl">Who runs it</h2>
        <p>Built by Caleb.</p>
        <p>
          Questions or mistakes to report? See the{" "}
          <Link href="/contact" className={link}>
            contact page
          </Link>
          . Or{" "}
          <Link href="/guides" className={link}>
            read the guides
          </Link>{" "}
          to see how we write.
        </p>
      </div>
    </PageShell>
  );
}
