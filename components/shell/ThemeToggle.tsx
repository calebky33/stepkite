"use client";

import { useEffect, useSyncExternalStore } from "react";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

type Theme = "system" | "light" | "dark";

const STORAGE_KEY = "sk_theme";
const THEMES: readonly Theme[] = ["system", "light", "dark"];

function isTheme(value: string | null): value is Theme {
  return THEMES.some((t) => t === value);
}

function apply(theme: Theme): void {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

const CHANGE_EVENT = "sk-theme-change";

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

function readTheme(): Theme {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return isTheme(saved) ? saved : "system";
  } catch {
    // Storage can be blocked. The theme then follows the system.
    return "system";
  }
}

/** Sets data-theme from an effect, so there is no inline script. A saved choice applies after load. */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, readTheme, (): Theme => "system");

  useEffect(() => {
    apply(theme);
  }, [theme]);

  const choose = (next: Theme) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The choice still applies for this visit.
    }
    apply(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  return (
    <SegmentedControl<Theme>
      label="Theme"
      value={theme}
      onValueChange={choose}
      options={[
        { value: "system", label: "System" },
        { value: "light", label: "Light" },
        { value: "dark", label: "Dark" },
      ]}
    />
  );
}
