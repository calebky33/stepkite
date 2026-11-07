import Link from "next/link";
import { PageShell } from "@/components/shell/PageShell";

import { SITE_URL } from "@/lib/seo";

export const metadata = {
  alternates: { canonical: `${SITE_URL}/contact` },
  title: "Contact Stepkite",
  description: "How to reach Stepkite by email.",
};

const link = "text-primary underline-offset-4 hover:underline";

export default function Contact() {
  return (
    <PageShell title="Contact" lead="Reach us by email." narrow>
      <div className="flex flex-col gap-4 text-base">
        <p>
          Email{" "}
          <a href="mailto:contact@stepkite.app" className={link}>
            contact@stepkite.app
          </a>{" "}
          with what went wrong or what you need.
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
