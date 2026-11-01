import Link from "next/link";
import { PageShell } from "@/components/shell/PageShell";

import { SITE_URL } from "@/lib/seo";

export const metadata = {
  alternates: { canonical: `${SITE_URL}/contact` },
  title: "Contact Stepkite",
  description: "How to reach Stepkite. Report a problem on GitHub or email us.",
};

const link = "text-primary underline-offset-4 hover:underline";

export default function Contact() {
  return (
    <PageShell title="Contact" lead="We don't have a support inbox yet." narrow>
      <div className="flex flex-col gap-4 text-base">
        <p>
          Open an issue on GitHub at{" "}
          <a href="https://github.com/calebky33/stepkite/issues" className={link}>
            github.com/calebky33/stepkite/issues
          </a>{" "}
          or email{" "}
          <a href="mailto:contact@stepkite.com" className={link}>
            contact@stepkite.com
          </a>
          . The email address will go live soon.
        </p>
        <p>
          If you want your data removed, you don&apos;t need to write to us. The account page has a
          delete button that does it straight away.
        </p>
        <p>
          <Link href="/account" className={link}>
            Go to your account
          </Link>
        </p>
      </div>
    </PageShell>
  );
}
