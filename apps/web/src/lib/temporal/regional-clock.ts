export interface RegionalClockValue {
  date: string;
  time: string;
  accessibleDateTime: string;
}

export function formatRegionalClock(
  value: Date,
  locale: string,
  timeZone: string,
): RegionalClockValue {
  return {
    date: new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeZone,
    }).format(value),
    time: new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
      timeZone,
    }).format(value),
    accessibleDateTime: new Intl.DateTimeFormat(locale, {
      dateStyle: "full",
      timeStyle: "short",
      timeZone,
    }).format(value),
  };
}

export function millisecondsUntilNextMinute(value: number): number {
  const remainder = value % 60_000;
  return remainder === 0 ? 60_000 : 60_000 - remainder;
}
