import Link from "next/link";
import { PageShell } from "@/components/shell/PageShell";

import { SITE_URL } from "@/lib/seo";

export const metadata = {
  alternates: { canonical: `${SITE_URL}/contact` },
  title: "Contact",
  description: "How to reach Stepkite. Support is still being set up.",
};

export default function Contact() {
  return (
    <PageShell title="Contact" lead="Support is still being set up." narrow>
      <div className="flex flex-col gap-4 text-base">
        <p>
          We have not opened a support inbox yet, so there is no email address to show. This page
          will list one as soon as it exists.
        </p>
        <p>
          If you want your data removed, you don&apos;t need to write to us. Once you can sign in,
          the account page has a delete button that does it straight away.
        </p>
        <p>
          <Link href="/account" className="text-primary underline underline-offset-2">
            Go to your account
          </Link>
        </p>
      </div>
    </PageShell>
  );
}
