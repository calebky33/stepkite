"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  // The account page's Upload link lands here with ?import=1. Honour it once, then
  // strip the param so a back or refresh does not re-open the import screen.
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const importParam = params?.get("import");
  const consumedImport = useRef(false);
  useEffect(() => {
    if (consumedImport.current || importParam !== "1") return;
    consumedImport.current = true;
    setScreen((current) => ({ name: "import", back: current }));
    if (pathname) router.replace(pathname, { scroll: false });
  }, [importParam, pathname, router]);
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
