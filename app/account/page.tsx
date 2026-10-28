import { PageShell } from "@/components/shell/PageShell";
import { stubMetadata } from "@/lib/seo";
import { AccountPanel } from "./AccountPanel";

export const metadata = stubMetadata({
  title: "Your account",
  description: "Manage your Stepkite account and delete your data.",
});

export default function Account() {
  return (
    <PageShell
      title="Your account"
      lead="Sign-in isn't open yet, so there's no account to show."
      narrow
    >
      <AccountPanel />
    </PageShell>
  );
}
