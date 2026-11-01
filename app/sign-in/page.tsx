import Link from "next/link";
import { AuthForm } from "@/components/shell/AuthForm";
import { PageShell } from "@/components/shell/PageShell";
import { stubMetadata } from "@/lib/seo";

type Props = { searchParams: Promise<{ next?: string }> };

export const metadata = stubMetadata({
  title: "Sign in",
  description: "Sign in to save your CV, sync between devices and track your applications.",
});

export default async function SignIn({ searchParams }: Props) {
  const params = await searchParams;
  const next = typeof params.next === "string" && params.next.startsWith("/") ? params.next : "/";
  return (
    <PageShell title="Sign in" lead="Welcome back. Pick how you want to sign in." narrow>
      <AuthForm mode="sign-in" next={next} />
      <p className="mt-5 text-sm text-muted">
        New here?{" "}
        <Link
          href={`/sign-up${next === "/" ? "" : `?next=${encodeURIComponent(next)}`}`}
          className="text-primary underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
        .
      </p>
    </PageShell>
  );
}
