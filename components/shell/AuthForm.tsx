"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import type { CountryCode } from "@/lib/countries";
import { useSavedCountry } from "@/lib/countryPreference";
import { CountryPicker } from "./CountryPicker";

type Mode = "sign-in" | "sign-up";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** What the two password routes can answer with. See app/api/auth/signin and signup. */
type FailureCode =
  | "invalid_credentials"
  | "password_too_weak"
  | "email_taken"
  | "email_not_confirmed"
  | "rate_limited"
  | "invalid"
  | string;

type Status = "idle" | "busy" | "unavailable" | "error" | "confirm" | "unconfirmed" | "slow";

/** Field-level messages, because the fix is in the form. Anything else is a status message. */
const FIELD_MESSAGE: Record<string, string> = {
  invalid_credentials: "Email or password is not right.",
  password_too_weak: "Pick a password with at least 8 characters.",
  email_taken: "That email already has an account. Sign in instead.",
  invalid: "Enter an email address like name@example.com.",
};

const STATUS_MESSAGE: Record<Exclude<Status, "idle" | "busy">, string> = {
  unavailable: "Accounts are not open yet. Check back soon.",
  error: "That did not go through. Try again in a minute.",
  confirm: "Check your inbox for the confirmation link, then sign in.",
  unconfirmed: "Confirm your email first. The link is in your inbox.",
  slow: "Too many tries. Wait a minute and try again.",
};

/** Shared shell for /sign-in and /sign-up. OAuth buttons post to stubs that return 503 until
 * Supabase lands. The password field is a textbox for now; a real flow replaces it. */
export function AuthForm({ mode, next }: { mode: Mode; next: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const isSignUp = mode === "sign-up";
  // Starts on the remembered or location-guessed market; the user can change it before signing up.
  const suggested = useSavedCountry();
  const [picked, setPicked] = useState<CountryCode | null>(null);
  const country = picked ?? suggested;
  const googleHref = `/api/auth/google?next=${encodeURIComponent(next)}${
    isSignUp ? `&country=${country}` : ""
  }`;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL.test(trimmed)) {
      setFieldError("Enter an email address like name@example.com.");
      return;
    }
    if (isSignUp && password.length < 8) {
      setPasswordError("Pick a password with at least 8 characters.");
      return;
    }
    setFieldError(undefined);
    setPasswordError(undefined);
    setStatus("busy");
    try {
      const res = await fetch(`/api/auth/${isSignUp ? "signup" : "signin"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isSignUp
            ? { email: trimmed, password, next, country }
            : { email: trimmed, password, next },
        ),
      });
      const body = (await res.json().catch(() => null)) as
        | { error?: FailureCode; confirmEmail?: boolean }
        | null;
      if (res.ok) {
        // Email confirmation projects answer without a session.
        if (body?.confirmEmail) setStatus("confirm");
        else window.location.assign(next);
        return;
      }
      const code = body?.error ?? "error";
      const field = FIELD_MESSAGE[code];
      if (field === FIELD_MESSAGE.password_too_weak) {
        setPasswordError(field);
        setStatus("idle");
      } else if (field) {
        setFieldError(field);
        setStatus("idle");
      } else if (code === "email_not_confirmed") setStatus("unconfirmed");
      else if (code === "rate_limited") setStatus("slow");
      else if (res.status === 503) setStatus("unavailable");
      else setStatus("error");
      return;
    } catch {
      setStatus("error");
    }
  };

  return (
    <Card className="flex flex-col gap-5 md:p-8">
      <h2 className="text-xl font-semibold">
        {isSignUp ? "Create your account" : "Sign in to your account"}
      </h2>
      {isSignUp ? (
        <CountryPicker
          value={country}
          onChange={setPicked}
          hint="You will see pay and CV tools for this country. You can change it later in your account."
        />
      ) : null}
      <div className="flex flex-col gap-2">
        <Link
          href={googleHref}
          prefetch={false}
          className="inline-flex min-h-11 items-center justify-center rounded-input border border-border-strong bg-surface px-4 text-base hover:bg-surface-2"
        >
          Continue with Google
        </Link>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted" role="separator">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          error={fieldError}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Password"
          type="password"
          name="password"
          autoComplete={isSignUp ? "new-password" : "current-password"}
          hint={isSignUp ? "At least 8 characters." : undefined}
          error={passwordError}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" loading={status === "busy"} className="self-start">
          {isSignUp ? "Create account" : "Sign in"}
        </Button>
        <p role="status" className="min-h-5 text-sm text-muted">
          {status === "idle" || status === "busy" ? null : STATUS_MESSAGE[status]}
        </p>
      </form>
    </Card>
  );
}
