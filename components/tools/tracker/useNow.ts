"use client";

import { useEffect, useState } from "react";

/** The current time as an ISO string, refreshed every minute so reminders stay right. */
export function useNow(intervalMs = 60_000): string {
  const [now, setNow] = useState(() => new Date().toISOString());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date().toISOString()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
