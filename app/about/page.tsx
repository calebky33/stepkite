import Link from "next/link";
import { PageShell } from "@/components/shell/PageShell";

import { SITE_URL } from "@/lib/seo";

export const metadata = {
  alternates: { canonical: `${SITE_URL}/about` },
  title: "About Stepkite",
  description:
    "Stepkite builds pay calculators and CV tools that follow the rules of the UK, the US and India.",
};

export default function About() {
  return (
    <PageShell
      title="About Stepkite"
      lead="Stepkite helps you work out your pay and apply for jobs, using the rules of the country you work in."
      narrow
    >
      <div className="flex flex-col gap-4 text-base">
        <p>
          Tax and CV rules change from country to country. A UK page should talk about National
          Insurance and A4 paper. A US page should talk about paychecks and letter paper. An India
          page should talk about CTC and in-hand salary. Stepkite is built around that.
        </p>
        <p>
          We are starting with the UK, the US and India. Three things come first: a take-home pay
          calculator, a CV builder and a job tracker.
        </p>
        <p>
          We are still building. The calculators show no tax figures until each rate has been
          checked against the official government source. We would rather show nothing than guess.
        </p>
        <p>
          Your CV stays on your device unless you sign in and turn on sync. The calculators run in
          your browser, so the salary you type is not sent anywhere.
        </p>
        <p>
          <Link href="/" className="text-primary underline-offset-4 hover:underline">
            Try the calculator
          </Link>
        </p>
      </div>
    </PageShell>
  );
}
