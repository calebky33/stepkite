import Link from "next/link";
import { PageShell } from "@/components/shell/PageShell";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <PageShell
      title="We can't find that page"
      lead="The link may be old, or the address may have a typo."
    >
      <Link
        href="/"
        className="inline-flex min-h-11 items-center rounded-input bg-primary px-4 text-base font-semibold text-primary-fg"
      >
        Go to the calculator
      </Link>
    </PageShell>
  );
}
