"use client";

import { useState } from "react";
import { CountryPicker } from "@/components/shell/CountryPicker";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { COUNTRY_INFO, type CountryCode } from "@/lib/countries";
import { saveCountry, useSavedCountry } from "@/lib/countryPreference";

type Status = "idle" | "busy" | "error" | "limited";

/** Shows and changes the account's home market. The site only shows this market while signed in. */
export function CountryCard({ current }: { current: CountryCode | null }) {
  const suggested = useSavedCountry();
  // Follows the location guess until the user picks, so a late /api/geo answer still shows.
  const [picked, setChoice] = useState<CountryCode | null>(null);
  const choice = picked ?? current ?? suggested;
  const [status, setStatus] = useState<Status>("idle");

  const save = async () => {
    setStatus("busy");
    try {
      const response = await fetch("/api/account/country", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country: choice }),
      });
      if (response.ok) {
        saveCountry(choice);
        // A full load so the header and footer pick up the new market from the server.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a router push would keep the cached layout with the old market.
        window.location.assign(`/${choice}`);
        return;
      }
      setStatus(response.status === 429 ? "limited" : "error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <Card id="country" className="flex scroll-mt-[calc(var(--header-h)+1rem)] flex-col gap-3">
      <h2 className="text-base font-semibold">Your country</h2>
      <p className="text-base text-muted">
        {current
          ? `You see tools for ${COUNTRY_INFO[current].name}. Change it if you have moved.`
          : "Pick the country you are job hunting in. You will only see tools for that country."}
      </p>
      <CountryPicker value={choice} onChange={setChoice} disabled={status === "busy"} />
      <Button
        variant="secondary"
        className="self-start"
        onClick={save}
        disabled={status === "busy" || choice === current}
      >
        Save country
      </Button>
      <div role="status" className="text-base">
        {status === "busy" ? "Saving." : null}
        {status === "error" ? "That didn't save. Try again." : null}
        {status === "limited" ? "Too many changes in a row. Try again in a minute." : null}
      </div>
    </Card>
  );
}
