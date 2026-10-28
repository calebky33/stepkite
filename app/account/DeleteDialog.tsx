"use client";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

type DeleteDialogProps = {
  busy: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function DeleteDialog({ busy, error, onConfirm, onCancel }: DeleteDialogProps) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onCancel();
      }}
      title="Delete your data?"
      description="Your account, synced CVs, saved jobs and profile will be deleted for good."
      footer={
        <>
          <Button variant="secondary" disabled={busy} onClick={onCancel}>
            Keep my data
          </Button>
          <Button loading={busy} onClick={onConfirm}>
            Delete my data
          </Button>
        </>
      }
    >
      <p role="alert" className="min-h-6 text-base text-danger">
        {error}
      </p>
    </Dialog>
  );
}
