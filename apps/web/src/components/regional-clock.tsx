"use client";

import { useEffect, useMemo, useState } from "react";
import { useRegionalContext } from "@/components/preferences/regional-context";
import { useTranslations } from "@/components/preferences/translation-context";
import {
  formatRegionalClock,
  millisecondsUntilNextMinute,
} from "@/lib/temporal/regional-clock";

export function RegionalClock() {
  const regional = useRegionalContext();
  const t = useTranslations();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    let timeoutId: number | undefined;

    function scheduleUpdate(): void {
      const currentTime = Date.now();
      setNow(new Date(currentTime));
      timeoutId = window.setTimeout(
        scheduleUpdate,
        millisecondsUntilNextMinute(currentTime),
      );
    }

    function handleVisibilityChange(): void {
      if (document.visibilityState === "visible") {
        window.clearTimeout(timeoutId);
        scheduleUpdate();
      }
    }

    scheduleUpdate();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const clock = useMemo(
    () =>
      now
        ? formatRegionalClock(now, regional.locale, regional.timeZone)
        : null,
    [now, regional.locale, regional.timeZone],
  );

  if (!clock) {
    return (
      <div
        className="invisible min-w-12 text-right tabular-nums lg:min-w-28"
        aria-hidden="true"
      >
        <p className="hidden text-xs leading-tight lg:block">00 sep 0000</p>
        <p className="text-sm font-medium leading-tight">00:00</p>
      </div>
    );
  }

  return (
    <time
      dateTime={now?.toISOString()}
      aria-label={`${t("header.currentDateTime")}: ${clock.accessibleDateTime}`}
      className="min-w-12 text-right tabular-nums lg:min-w-28"
    >
      <span className="hidden truncate text-xs leading-tight text-muted lg:block">
        {clock.date}
      </span>
      <span className="block whitespace-nowrap text-sm font-medium leading-tight text-foreground">
        {clock.time}
      </span>
    </time>
  );
}
