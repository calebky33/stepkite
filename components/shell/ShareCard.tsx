"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { CountryCode } from "@/lib/countries";

type ShareCardProps = { country: CountryCode; gross: number };

type CopyState = "idle" | "copied" | "failed";

/** Links to the share image. The image holds a country and a salary only. */
export function ShareCard({ country, gross }: ShareCardProps) {
  const [state, setState] = useState<CopyState>("idle");
  const path = `/api/og?country=${country}&gross=${Math.round(gross)}`;

  useEffect(() => {
    if (state === "idle") return;
    const id = setTimeout(() => setState("idle"), 2500);
    return () => clearTimeout(id);
  }, [state]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setState("copied");
    } catch {
      setState("failed");
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-card border border-border p-4">
      <p className="text-base font-semibold">Share this salary</p>
      <p className="text-sm text-muted">
        The image shows the country and the salary. Nothing else.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={copy}>
          Copy link
        </Button>
        <a
          href={path}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center text-base text-primary underline-offset-4 hover:underline"
        >
          Open the image
        </a>
      </div>
      <p role="status" className="min-h-5 text-sm text-muted">
        {state === "copied" ? "Link copied." : null}
        {state === "failed" ? "Couldn't copy. Open the image and copy its address." : null}
      </p>
    </div>
  );
}
