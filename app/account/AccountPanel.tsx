"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { BillingSummary } from "@/components/billing/BillingSummary";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

// Radix Dialog loads only when someone asks to delete.
const DeleteDialog = dynamic(() => import("./DeleteDialog"), { ssr: false });

type Outcome = { kind: "none" } | { kind: "deleted" } | { kind: "message"; text: string };

export function AccountPanel() {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | undefined>();
  const [outcome, setOutcome] = useState<Outcome>({ kind: "none" });

  const confirmDelete = async () => {
    setBusy(true);
    setDialogError(undefined);
    try {
      const response = await fetch("/api/delete-my-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      if (response.ok) {
        setConfirming(false);
        setOutcome({ kind: "deleted" });
      } else if (response.status === 401) {
        setConfirming(false);
        setOutcome({
          kind: "message",
          text: "You're not signed in, so we hold nothing to delete. Data saved on this device stays here until you clear this site's data in your browser.",
        });
      } else if (response.status === 503) {
        setDialogError("Deleting isn't available right now. Nothing was deleted. Try again later.");
      } else {
        setDialogError("That didn't work and nothing was deleted. Try again.");
      }
    } catch {
      setDialogError("We couldn't reach the server. Check your connection. Nothing was deleted.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <BillingSummary />

      <Card className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Delete my data</h2>
        <p className="text-base text-muted">
          This deletes your account, your synced CVs, your saved jobs and your profile. It
          can&apos;t be undone.
        </p>
        <Button variant="secondary" className="self-start" onClick={() => setConfirming(true)}>
          Delete my data
        </Button>
        <div role="status" className="text-base">
          {outcome.kind === "deleted" ? "Your account and synced data are deleted." : null}
          {outcome.kind === "message" ? outcome.text : null}
        </div>
      </Card>

      {confirming ? (
        <DeleteDialog
          busy={busy}
          error={dialogError}
          onConfirm={confirmDelete}
          onCancel={() => {
            setConfirming(false);
            setDialogError(undefined);
          }}
        />
      ) : null}
    </div>
  );
}
