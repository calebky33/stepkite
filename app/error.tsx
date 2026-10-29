"use client";

import Link from "next/link";
import { PageShell } from "@/components/shell/PageShell";
import { Button } from "@/components/ui/Button";

export default function ErrorPage({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <PageShell
      title="This page didn't load"
      lead="Nothing you typed was lost or sent anywhere. Try again."
    >
      <div className="flex flex-wrap items-center gap-4">
        <Button onClick={() => retry()}>Try again</Button>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center text-base text-primary underline-offset-4 hover:underline"
        >
          Go to the home page
        </Link>
      </div>
    </PageShell>
  );
}
