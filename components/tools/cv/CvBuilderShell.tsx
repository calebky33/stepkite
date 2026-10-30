"use client";

import { useEffect, useRef, useState } from "react";
import type { CountryCode } from "@/lib/countries";
import { newCvId } from "@/lib/storage/cvStore";
import { CvImportScreen } from "./CvImportScreen";
import { CvEditorScreen } from "./CvEditorScreen";
import { CvListScreen } from "./CvListScreen";

/** The CV saved before there was a list keeps this id, so nobody loses it. */
const FIRST_CV_ID = "default";

type Screen =
  { name: "editor"; cvId: string } | { name: "list" } | { name: "import"; back: Screen };

export function CvBuilderShell({ country }: { country: CountryCode }) {
  const [screen, setScreen] = useState<Screen>({ name: "editor", cvId: FIRST_CV_ID });
  // Set when someone backs out of the import step, so focus can go back to the button they used.
  const returnFocus = useRef(false);
  useEffect(() => {
    if (screen.name === "import" || !returnFocus.current) return;
    returnFocus.current = false;
    document.querySelector<HTMLElement>("[data-cv-upload]")?.focus();
  }, [screen]);
  if (screen.name === "import") {
    return (
      <CvImportScreen
        country={country}
        onCancel={() => {
          returnFocus.current = true;
          setScreen(screen.back);
        }}
        onCreated={(cvId) => setScreen({ name: "editor", cvId })}
      />
    );
  }
  if (screen.name === "list") {
    return (
      <CvListScreen
        country={country}
        onOpen={(cvId) => setScreen({ name: "editor", cvId })}
        onNew={() => setScreen({ name: "editor", cvId: newCvId() })}
        onImport={() => setScreen({ name: "import", back: screen })}
      />
    );
  }
  return (
    <CvEditorScreen
      key={screen.cvId}
      country={country}
      cvId={screen.cvId}
      onShowList={() => setScreen({ name: "list" })}
      onImport={() => setScreen({ name: "import", back: screen })}
    />
  );
}
