import type { Metadata } from "next";
import { getSession } from "@/lib/auth/session";
import { Card } from "@/components/ui/Card";
import { PageShell } from "@/components/shell/PageShell";
import { stubMetadata } from "@/lib/seo";
import { AccountPanel } from "./AccountPanel";

export const metadata: Metadata = stubMetadata({
  title: "Your account",
  description: "Manage your Stepkite account and delete your data.",
});

// Signed-in account content must never be served from a shared cache,
// so this route is always rendered per request.
export const dynamic = "force-dynamic";

function memberSince(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(date);
}

export default async function Account() {
  const user = await getSession();
  const joined = user?.createdAt ? memberSince(user.createdAt) : null;
  return (
    <PageShell title="Your account" lead="Your plan, your sign in, and your data." narrow>
      {user ? (
        <Card className="mb-6 flex flex-col gap-3">
          <h2 className="text-base font-semibold">Your profile</h2>
          <dl className="grid gap-2 text-base md:grid-cols-[8rem_1fr]">
            <dt className="text-muted">Email</dt>
            <dd className="break-all text-text">{user.email || "No email on file"}</dd>
            {joined ? (
              <>
                <dt className="text-muted">Member since</dt>
                <dd className="text-text">{joined}</dd>
              </>
            ) : null}
          </dl>
        </Card>
      ) : null}
      <AccountPanel />
    </PageShell>
  );
}
