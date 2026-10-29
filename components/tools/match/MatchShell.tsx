"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { COUNTRY_INFO, type CountryCode } from "@/lib/countries";
import { listIds } from "@/lib/storage/db";

/** Largest job ad we will accept. Longer text is cut by the field. */
export const AD_LIMIT = 6000;

type Load = "loading" | "ready" | "unavailable";

const ROWS = [1, 2, 3] as const;

/**
 * Layout only. Matching is not built yet, so nothing here calls the network.
 * The right column shows the shape of the result with clearly marked placeholders.
 */
export function MatchShell({ country }: { country: CountryCode }) {
  const cvName = COUNTRY_INFO[country].cvName;
  const [ad, setAd] = useState("");
  const [cvIds, setCvIds] = useState<string[]>([]);
  const [cvId, setCvId] = useState<string | undefined>();
  const [load, setLoad] = useState<Load>("loading");

  useEffect(() => {
    let cancelled = false;
    void listIds("cvs").then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setCvIds(result.value);
        setLoad("ready");
      } else {
        setLoad("unavailable");
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex min-w-0 flex-col gap-8">
      <p
        role="status"
        className="rounded-card border border-border bg-accent-soft p-4 text-base font-semibold"
      >
        Job ad matching is not available yet.
      </p>
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-8">
        <Card className="flex min-w-0 flex-col gap-6 md:p-8">
          <Field label="Job ad" hint="Paste the full text of the ad. It stays on this page.">
            {(control) => (
              <>
                <textarea
                  id={control.id}
                  aria-describedby={control["aria-describedby"]}
                  value={ad}
                  maxLength={AD_LIMIT}
                  rows={10}
                  onChange={(e) => setAd(e.target.value)}
                  className="min-h-48 w-full min-w-0 resize-y rounded-input border border-border-strong bg-surface-2 px-3 py-2 text-base text-text"
                />
                <p className="text-sm tabular-nums text-muted" aria-live="polite">
                  {ad.length.toLocaleString("en-GB")} of {AD_LIMIT.toLocaleString("en-GB")}{" "}
                  characters
                </p>
              </>
            )}
          </Field>

          {load === "loading" ? (
            <div aria-busy="true">
              <p role="status" className="sr-only">
                Loading your saved {cvName}s
              </p>
              <Skeleton className="h-11 w-full" />
            </div>
          ) : load === "unavailable" ? (
            <p role="alert" className="text-danger">
              Saved {cvName}s cannot be read in this browser. A private window can cause this.
            </p>
          ) : cvIds.length === 0 ? (
            <p className="text-base">
              No {cvName} saved yet.{" "}
              <Link
                href={`/${country}/cv`}
                className="font-semibold text-primary underline-offset-4 hover:underline"
              >
                Build one first.
              </Link>
            </p>
          ) : (
            <Select
              label={`Which ${cvName}`}
              options={cvIds.map((id, index) => ({
                value: id,
                label: `Saved ${cvName} ${index + 1}`,
              }))}
              value={cvId}
              onValueChange={setCvId}
            />
          )}

          <div className="flex flex-col gap-2">
            <Button disabled className="self-start">
              Match
            </Button>
            <p className="text-sm text-muted">Match opens when the tool is ready.</p>
          </div>
        </Card>

        <Card
          role="region"
          className="flex min-w-0 flex-col gap-8 md:p-8"
          aria-labelledby="match-result"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="match-result" className="font-display text-[22px] leading-tight">
              Result
            </h2>
            <Badge tone="highlight">Placeholder</Badge>
          </div>
          <div aria-live="polite" className="flex flex-col gap-6">
            <p className="text-muted">
              Nothing to show yet. When matching opens, the result will look like this.
            </p>
            <section aria-labelledby="match-requirements" className="flex flex-col gap-3">
              <h3 id="match-requirements" className="text-base font-semibold">
                What the ad asks for
              </h3>
              <ul className="flex flex-col gap-3">
                {ROWS.map((n) => (
                  <li
                    key={n}
                    className="rounded-input border border-dashed border-border-strong p-3"
                  >
                    <p className="text-sm font-semibold">Requirement {n}</p>
                    <p className="text-sm text-muted">
                      Evidence: the line in your {cvName} that shows it, or a note that none was
                      found.
                    </p>
                  </li>
                ))}
              </ul>
            </section>
            <section aria-labelledby="match-rewording" className="flex flex-col gap-3">
              <h3 id="match-rewording" className="text-base font-semibold">
                Suggested rewording
              </h3>
              <p className="text-sm text-muted">
                We only reword lines you already wrote. You accept each one.
              </p>
              <ul className="flex flex-col gap-3">
                {ROWS.slice(0, 2).map((n) => (
                  <li
                    key={n}
                    className="flex flex-col gap-2 rounded-input border border-dashed border-border-strong p-3"
                  >
                    <p className="text-sm">
                      <span className="font-semibold">Before: </span>
                      <span className="text-muted">Your current line {n}.</span>
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold">After: </span>
                      <span className="text-muted">The suggested line {n}.</span>
                    </p>
                    <Button variant="secondary" disabled className="self-start">
                      Accept line {n}
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </Card>
      </div>
    </div>
  );
}
