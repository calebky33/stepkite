"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

type Mode = "sign-in" | "sign-up";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Shared shell for /sign-in and /sign-up. OAuth buttons post to stubs that return 503 until
 * Supabase lands. The password field is a textbox for now; a real flow replaces it. */
export function AuthForm({ mode, next }: { mode: Mode; next: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "busy" | "unavailable" | "error">("idle");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const isSignUp = mode === "sign-up";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL.test(trimmed)) {
      setFieldError("Enter an email address like name@example.com.");
      return;
    }
    if (password.length < 8) {
      setFieldError("Pick a password with at least 8 characters.");
      return;
    }
    setFieldError(undefined);
    setStatus("busy");
    try {
      const res = await fetch(`/api/auth/${isSignUp ? "signup" : "signin"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, password, next }),
      });
      if (res.status === 503) setStatus("unavailable");
      else if (!res.ok) setStatus("error");
      else window.location.assign(next);
    } catch {
      setStatus("error");
    }
  };

  return (
    <Card className="flex flex-col gap-5 md:p-8">
      <h2 className="text-xl font-semibold">
        {isSignUp ? "Create your account" : "Sign in to your account"}
      </h2>
      <div className="flex flex-col gap-2">
        <Link
          href="/api/auth/google"
          prefetch={false}
          className="inline-flex min-h-11 items-center justify-center rounded-input border border-border-strong bg-surface px-4 text-base hover:bg-surface-2"
        >
          Continue with Google
        </Link>
        <Link
          href="/api/auth/linkedin"
          prefetch={false}
          className="inline-flex min-h-11 items-center justify-center rounded-input border border-border-strong bg-surface px-4 text-base hover:bg-surface-2"
        >
          Continue with LinkedIn
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
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" loading={status === "busy"} className="self-start">
          {isSignUp ? "Create account" : "Sign in"}
        </Button>
        <p role="status" className="min-h-5 text-sm text-muted">
          {status === "unavailable"
            ? "Accounts are not open yet. Check back soon."
            : status === "error"
              ? "That didn't go through. Try again in a minute."
              : null}
        </p>
      </form>
    </Card>
  );
}
