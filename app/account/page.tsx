import { PageShell } from "@/components/shell/PageShell";
import { stubMetadata } from "@/lib/seo";
import { AccountPanel } from "./AccountPanel";

export const metadata = stubMetadata({
  title: "Your account",
  description: "Manage your Stepkite account and delete your data.",
});

export default function Account() {
  return (
    <PageShell title="Your account" lead="Your plan, your sign in, and your data." narrow>
      <AccountPanel />
    </PageShell>
  );
}
