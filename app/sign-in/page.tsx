import Link from "next/link";
import { PageShell } from "@/components/shell/PageShell";
import { stubMetadata } from "@/lib/seo";

export const metadata = stubMetadata({
  title: "Sign in",
  description: "Sign in to sync your CVs and saved jobs between devices. Sign-in is not open yet.",
});

export default function SignIn() {
  return (
    <PageShell
      title="Sign in"
      lead="Sign-in isn't open yet. You don't need an account to use the calculators or build a CV."
      narrow
    >
      <div className="flex flex-col gap-4 text-base">
        <p>
          An account will let you sync your CVs and saved jobs between devices. Your data stays on
          this device until then.
        </p>
        <p>
          <Link href="/" className="text-primary underline underline-offset-2">
            Back to the calculator
          </Link>
        </p>
      </div>
    </PageShell>
  );
}
