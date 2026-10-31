"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Status = "idle" | "loading" | "success" | "unavailable" | "error" | "challenge-failed";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SITEKEY = process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY ?? "";

// Minimal shape of the global the Turnstile script installs.
interface TurnstileGlobal {
  render: (
    el: HTMLElement,
    options: {
      sitekey: string;
      action?: string;
      size?: "normal" | "flexible" | "compact" | "invisible";
      appearance?: "always" | "execute" | "interaction-only";
      callback?: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
    },
  ) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId: string) => void;
  getResponse: (widgetId?: string) => string | undefined;
}

declare global {
  interface Window {
    turnstile?: TurnstileGlobal;
  }
}

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [status, setStatus] = useState<Status>("idle");
  const [token, setToken] = useState<string>("");
  const widgetHost = useRef<HTMLDivElement | null>(null);
  const widgetId = useRef<string | null>(null);

  const mount = useCallback(() => {
    if (!SITEKEY || !widgetHost.current || widgetId.current || !window.turnstile) return;
    widgetId.current = window.turnstile.render(widgetHost.current, {
      sitekey: SITEKEY,
      action: "newsletter",
      appearance: "interaction-only",
      callback: (t) => setToken(t),
      "expired-callback": () => setToken(""),
      "error-callback": () => setToken(""),
    });
  }, []);

  useEffect(() => {
    // Script may have loaded already on client navigation.
    if (window.turnstile) mount();
    return () => {
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
    };
  }, [mount]);

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
        body: JSON.stringify(SITEKEY ? { email: trimmed, turnstile: token } : { email: trimmed }),
      });
      if (response.ok) setStatus("success");
      else if (response.status === 503) setStatus("unavailable");
      else if (response.status === 403) setStatus("challenge-failed");
      else if (response.status === 400) {
        setFieldError("Enter an email address like name@example.com.");
        setStatus("idle");
      } else setStatus("error");
      // Tokens are single use. Reset the widget so the next submit gets a fresh one.
      if (widgetId.current && window.turnstile) {
        window.turnstile.reset(widgetId.current);
        setToken("");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <>
      {SITEKEY ? (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="afterInteractive"
          onLoad={mount}
        />
      ) : null}
      <form
        onSubmit={submit}
        noValidate
        className="flex flex-col gap-2 min-[360px]:grid min-[360px]:grid-cols-[minmax(0,1fr)_auto] min-[360px]:items-start min-[360px]:gap-x-2 min-[360px]:gap-y-0 sm:gap-x-3 max-lg:[&_p:not([role])]:text-ink-muted"
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
        <Button
          type="submit"
          loading={status === "loading"}
          className="self-start min-[360px]:mt-6"
        >
          Email me updates
        </Button>
        {SITEKEY ? (
          <div ref={widgetHost} className="min-[360px]:col-span-2" aria-hidden="true" />
        ) : null}
        <p role="status" className="min-h-5 text-sm min-[360px]:col-span-2">
          {status === "success" ? "Done. We'll email you when a new tool opens." : null}
          {status === "unavailable"
            ? "Sign-up isn't open yet, so we haven't saved your email. Check back later."
            : null}
          {status === "challenge-failed"
            ? "That didn't look like a human. Reload the page and try again."
            : null}
          {status === "error" ? "That didn't go through. Try again in a minute." : null}
        </p>
      </form>
    </>
  );
}
