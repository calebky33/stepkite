"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Status = "idle" | "loading" | "success" | "unavailable" | "error";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [status, setStatus] = useState<Status>("idle");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL_PATTERN.test(trimmed)) {
      setFieldError("Enter an email address like name@example.com.");
      return;
    }
    setFieldError(undefined);
    setStatus("loading");
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      if (response.ok) setStatus("success");
      else if (response.status === 503) setStatus("unavailable");
      else if (response.status === 400) {
        setFieldError("Enter an email address like name@example.com.");
        setStatus("idle");
      } else setStatus("error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <form
      onSubmit={submit}
      noValidate
      className="flex flex-col gap-2 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-x-3 sm:gap-y-0"
    >
      <Input
        label="Email address"
        hint="We email only when a new tool opens."
        type="email"
        name="email"
        autoComplete="email"
        value={email}
        error={fieldError}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Button type="submit" loading={status === "loading"} className="self-start sm:mt-6">
        Email me updates
      </Button>
      <p role="status" className="min-h-5 text-sm sm:col-span-2">
        {status === "success" ? "Done. We'll email you when a new tool opens." : null}
        {status === "unavailable"
          ? "Sign-up isn't open yet, so we haven't saved your email. Check back later."
          : null}
        {status === "error" ? "That didn't go through. Try again in a minute." : null}
      </p>
    </form>
  );
}
