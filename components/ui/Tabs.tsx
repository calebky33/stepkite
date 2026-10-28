"use client";

import * as RadixTabs from "@radix-ui/react-tabs";
import type { ReactNode } from "react";
import { cn } from "./cn";

export type TabItem = { value: string; label: string; content: ReactNode; disabled?: boolean };

type TabsProps = {
  /** Names the tab list for screen readers. */
  label: string;
  tabs: TabItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
};

export function Tabs({ label, tabs, value, defaultValue, onValueChange, className }: TabsProps) {
  return (
    <RadixTabs.Root
      value={value}
      defaultValue={value === undefined ? (defaultValue ?? tabs[0]?.value) : undefined}
      onValueChange={onValueChange}
      className={cn("flex min-w-0 flex-col", className)}
    >
      <RadixTabs.List
        aria-label={label}
        className="flex gap-1 overflow-x-auto border-b border-border"
      >
        {tabs.map((tab) => (
          <RadixTabs.Trigger
            key={tab.value}
            value={tab.value}
            disabled={tab.disabled}
            className={cn(
              "min-h-11 shrink-0 select-none whitespace-nowrap border-b-2 border-transparent px-4 text-base text-muted",
              "transition-colors duration-150 ease-[var(--ease-out)] hover:text-text",
              "data-[state=active]:border-primary data-[state=active]:font-semibold data-[state=active]:text-text",
              "disabled:opacity-50",
            )}
          >
            {tab.label}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {tabs.map((tab) => (
        <RadixTabs.Content key={tab.value} value={tab.value} className="pt-4">
          {tab.content}
        </RadixTabs.Content>
      ))}
    </RadixTabs.Root>
  );
}
