"use client";

import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentProps,
} from "react";
import { cn } from "./cn";
import { Field } from "./Field";

type CurrencyInputProps = Omit<
  ComponentProps<"input">,
  "id" | "value" | "defaultValue" | "onChange" | "type" | "inputMode"
> & {
  label: string;
  hint?: string;
  error?: string;
  /** BCP 47 tag, for example en-GB, en-US or en-IN. Decides grouping, so en-IN gives lakh grouping. */
  locale: string;
  /** ISO 4217 code, for example GBP, USD or INR. */
  currency: string;
  /** Controlled value. Use null for empty. */
  value?: number | null;
  defaultValue?: number | null;
  onValueChange?: (value: number | null) => void;
  /** Decimal places allowed. Default 0. */
  maxFractionDigits?: number;
  /** Whole digits allowed. Default 12. */
  maxIntegerDigits?: number;
};

type Parts = { decimal: string; symbol: string };

function localeParts(locale: string, currency: string): Parts {
  const fmt = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 1,
  });
  const parts = fmt.formatToParts(1.1);
  return {
    decimal: parts.find((p) => p.type === "decimal")?.value ?? ".",
    symbol: parts.find((p) => p.type === "currency")?.value ?? currency,
  };
}

/** Turn what the user typed into digits plus an optional decimal part. */
function clean(raw: string, decimal: string, maxInt: number, maxFrac: number) {
  let whole = "";
  let frac = "";
  let seenDecimal = false;
  for (const ch of raw) {
    if (ch >= "0" && ch <= "9") {
      if (seenDecimal) {
        if (frac.length < maxFrac) frac += ch;
      } else if (whole.length < maxInt) whole += ch;
    } else if (maxFrac > 0 && ch === decimal && !seenDecimal) {
      seenDecimal = true;
    }
  }
  return { whole: whole.replace(/^0+(?=\d)/, ""), frac, seenDecimal };
}

function toNumber(whole: string, frac: string): number | null {
  if (whole === "" && frac === "") return null;
  return Number(`${whole || "0"}${frac ? `.${frac}` : ""}`);
}

export function CurrencyInput({
  label,
  hint,
  error,
  locale,
  currency,
  value,
  defaultValue,
  onValueChange,
  maxFractionDigits = 0,
  maxIntegerDigits = 12,
  className,
  onBlur,
  ref,
  ...props
}: CurrencyInputProps) {
  const { decimal, symbol } = useMemo(() => localeParts(locale, currency), [locale, currency]);
  const groupFmt = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }), [locale]);

  const format = (whole: string, frac: string, seenDecimal: boolean) => {
    const grouped = whole === "" ? (seenDecimal ? "0" : "") : groupFmt.format(Number(whole));
    return seenDecimal ? `${grouped}${decimal}${frac}` : grouped;
  };

  const fromNumber = (n: number | null | undefined) => {
    if (n === null || n === undefined || Number.isNaN(n)) return "";
    const fixed = n.toFixed(maxFractionDigits);
    const [w, f = ""] = fixed.split(".");
    const trimmed = f.replace(/0+$/, "");
    return format(w, trimmed, trimmed.length > 0);
  };

  const [text, setText] = useState(() => fromNumber(value ?? defaultValue));
  const inputRef = useRef<HTMLInputElement | null>(null);
  const caretDigits = useRef<number | null>(null);

  // Follow outside changes to a controlled value without fighting the user's typing.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== undefined && value !== prevValue) {
    setPrevValue(value);
    const c = clean(text, decimal, maxIntegerDigits, maxFractionDigits);
    if (toNumber(c.whole, c.frac) !== value) setText(fromNumber(value));
  }

  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el || caretDigits.current === null) return;
    let seen = 0;
    let pos = 0;
    const target = caretDigits.current;
    while (pos < el.value.length && seen < target) {
      if (el.value[pos] >= "0" && el.value[pos] <= "9") seen += 1;
      pos += 1;
    }
    el.setSelectionRange(pos, pos);
    caretDigits.current = null;
  }, [text]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const el = event.target;
    const before = el.value.slice(0, el.selectionStart ?? el.value.length);
    caretDigits.current = (before.match(/\d/g) ?? []).length;
    const c = clean(el.value, decimal, maxIntegerDigits, maxFractionDigits);
    const next = format(c.whole, c.frac, c.seenDecimal);
    setText(next);
    onValueChange?.(toNumber(c.whole, c.frac));
  };

  return (
    <Field label={label} hint={hint} error={error}>
      {(control) => (
        <div
          className={cn(
            "flex min-h-11 w-full min-w-0 items-center rounded-input border bg-surface-2",
            "transition-colors duration-150 ease-[var(--ease-out)]",
            "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary",
            error ? "border-danger" : "border-border-strong",
            props.disabled && "opacity-50",
            className,
          )}
        >
          <span aria-hidden="true" className="select-none pl-3 text-base text-muted">
            {symbol}
          </span>
          <input
            {...props}
            ref={(node) => {
              inputRef.current = node;
              if (typeof ref === "function") ref(node);
              else if (ref) ref.current = node;
            }}
            id={control.id}
            type="text"
            inputMode={maxFractionDigits > 0 ? "decimal" : "numeric"}
            autoComplete="off"
            aria-invalid={control["aria-invalid"]}
            aria-describedby={control["aria-describedby"]}
            value={text}
            onChange={handleChange}
            onBlur={(e) => {
              const c = clean(text, decimal, maxIntegerDigits, maxFractionDigits);
              setText(fromNumber(toNumber(c.whole, c.frac)));
              onBlur?.(e);
            }}
            className="min-h-10 w-full min-w-0 bg-transparent px-2 text-base tabular-nums text-text outline-none"
          />
        </div>
      )}
    </Field>
  );
}
