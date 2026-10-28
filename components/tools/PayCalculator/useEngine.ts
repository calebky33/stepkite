"use client";

import { useEffect, useState } from "react";
import type { CountryCode } from "@/lib/countries";
import { loadEngine } from "@/lib/tax";
import type { PayEngine } from "@/lib/tax/types";

export type EngineState =
  { status: "loading" } | { status: "ready"; engine: PayEngine } | { status: "failed" };

type Loaded = { country: CountryCode; engine: PayEngine | null };

/** Loads the engine for one country on demand, so a page never carries the other two. */
export function useEngine(country: CountryCode): EngineState {
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadEngine(country)
      .then((engine) => {
        if (!cancelled) setLoaded({ country, engine });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ country, engine: null });
      });
    return () => {
      cancelled = true;
    };
  }, [country]);

  if (!loaded || loaded.country !== country) return { status: "loading" };
  if (!loaded.engine) return { status: "failed" };
  return { status: "ready", engine: loaded.engine };
}
