"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CountryCode } from "@/lib/countries";
import { CvEditorScreen } from "./CvEditorScreen";
import { SandboxBanner } from "./SandboxBanner";

/** The sandbox editor only ever has one draft, keyed with this id so a sign-up moves one row. */
const SANDBOX_CV_ID = "cv-sandbox";
/** Seconds of real typing before the sign-up banner appears. From docs/MONETIZATION.md. */
const BANNER_SECONDS = 60;

/**
 * The anonymous CV editor. Mirrors the signed-in builder but saves to localStorage, offers no
 * list, no snapshots, and no named versions. The sign-up banner mounts once the visitor has
 * typed for 60 seconds, or on the first click of Save now or Download PDF.
 *
 * See docs/MONETIZATION.md (Soft-start sandbox) and docs/RULES.md rule 16.
 */
export function SandboxShell({ country }: { country: CountryCode }) {
  const [showBanner, setShowBanner] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const seconds = useRef(0);

  useEffect(() => {
    if (showBanner) return;
    const node = containerRef.current;
    if (!node) return;
    let typedThisSecond = false;
    const onInput = () => {
      typedThisSecond = true;
    };
    const tick = window.setInterval(() => {
      if (!typedThisSecond) return;
      typedThisSecond = false;
      seconds.current += 1;
      if (seconds.current >= BANNER_SECONDS) setShowBanner(true);
    }, 1000);
    node.addEventListener("input", onInput, true);
    return () => {
      node.removeEventListener("input", onInput, true);
      window.clearInterval(tick);
    };
  }, [showBanner]);

  const onSaveOrExport = useCallback(() => setShowBanner(true), []);

  return (
    <div ref={containerRef} className="flex flex-col gap-6">
      {showBanner ? <SandboxBanner country={country} /> : null}
      <CvEditorScreen
        country={country}
        cvId={SANDBOX_CV_ID}
        sandbox
        onSaveOrExport={onSaveOrExport}
        // The list and import screens read from IndexedDB, which is empty in the sandbox.
        // These stay as no-ops; the buttons that would open them are hidden in sandbox mode.
        onShowList={onSaveOrExport}
        onImport={onSaveOrExport}
      />
    </div>
  );
}
