"use client";

import * as RadixSelect from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "./cn";
import { Field } from "./Field";

export type SelectOption = { value: string; label: string; disabled?: boolean };

type SelectProps = {
  label: string;
  hint?: string;
  error?: string;
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  name?: string;
  disabled?: boolean;
  className?: string;
  ref?: ComponentProps<"button">["ref"];
};

export function Select({
  label,
  hint,
  error,
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder = "Choose one",
  name,
  disabled,
  className,
  ref,
}: SelectProps) {
  return (
    <Field label={label} hint={hint} error={error}>
      {(control) => (
        <RadixSelect.Root
          value={value}
          defaultValue={defaultValue}
          onValueChange={onValueChange}
          name={name}
          disabled={disabled}
        >
          <RadixSelect.Trigger
            ref={ref}
            id={control.id}
            aria-invalid={control["aria-invalid"]}
            aria-describedby={control["aria-describedby"]}
            className={cn(
              "flex min-h-11 w-full min-w-0 items-center justify-between gap-2 rounded-input border bg-surface-2 px-3 text-left text-base text-text",
              "transition-colors duration-150 ease-[var(--ease-out)] disabled:opacity-50",
              "data-[placeholder]:text-muted",
              error ? "border-danger" : "border-border-strong",
              className,
            )}
          >
            <span className="min-w-0 truncate">
              <RadixSelect.Value placeholder={placeholder} />
            </span>
            <RadixSelect.Icon aria-hidden="true" className="shrink-0 text-muted">
              <ChevronDown size={18} />
            </RadixSelect.Icon>
          </RadixSelect.Trigger>
          <RadixSelect.Portal>
            <RadixSelect.Content
              position="popper"
              sideOffset={4}
              className={cn(
                "sk-anim sk-pop z-50 w-[var(--radix-select-trigger-width)] overflow-hidden rounded-input border border-border bg-surface text-text shadow-pop",
                "max-h-[min(20rem,var(--radix-select-content-available-height))] origin-[var(--radix-select-content-transform-origin)]",
              )}
            >
              <RadixSelect.Viewport className="p-1">
                {options.map((option) => (
                  <RadixSelect.Item
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    className={cn(
                      "flex min-h-11 cursor-pointer select-none items-center justify-between gap-2 rounded-input px-3 text-base outline-none",
                      "data-[highlighted]:bg-surface-2 data-[disabled]:opacity-50",
                      "data-[state=checked]:font-semibold",
                    )}
                  >
                    <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                    <RadixSelect.ItemIndicator aria-hidden="true" className="shrink-0 text-primary">
                      <Check size={18} />
                    </RadixSelect.ItemIndicator>
                  </RadixSelect.Item>
                ))}
              </RadixSelect.Viewport>
            </RadixSelect.Content>
          </RadixSelect.Portal>
        </RadixSelect.Root>
      )}
    </Field>
  );
}
