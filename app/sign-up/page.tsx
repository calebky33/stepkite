import Link from "next/link";
import { AuthForm } from "@/components/shell/AuthForm";
import { PageShell } from "@/components/shell/PageShell";
import { stubMetadata } from "@/lib/seo";

type Props = { searchParams: Promise<{ next?: string }> };

export const metadata = stubMetadata({
  title: "Create your account",
  description: "A free account to save your CV, sync between devices and track jobs.",
});

export default async function SignUp({ searchParams }: Props) {
  const params = await searchParams;
  const next = typeof params.next === "string" && params.next.startsWith("/") ? params.next : "/";
  return (
    <PageShell
      title="Create your account"
      lead="Free to start. Build, preview and save with no card."
      narrow
    >
      <AuthForm mode="sign-up" next={next} />
      <p className="mt-5 text-sm text-muted">
        Already have one?{" "}
        <Link
          href={`/sign-in${next === "/" ? "" : `?next=${encodeURIComponent(next)}`}`}
          className="text-primary underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
        .
      </p>
      <p className="mt-3 text-xs text-muted">
        By creating an account you agree to our{" "}
        <Link href="/terms" className="underline-offset-4 hover:underline">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline-offset-4 hover:underline">
          Privacy
        </Link>
        .
      </p>
    </PageShell>
  );
}
