import {
  parseCalendarDate,
  parseLocalTime,
  type CalendarDate,
  type LocalTime,
} from "./calendar.ts";

export type UtcInstant = string & { readonly __utcInstant: unique symbol };

export type LocalDateTimeConversion =
  | { status: "ok"; instant: UtcInstant }
  | { status: "invalid-date" }
  | { status: "invalid-time" }
  | { status: "invalid-time-zone" }
  | { status: "nonexistent" }
  | { status: "ambiguous"; candidates: readonly UtcInstant[] };

interface DateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

const UTC_INSTANT_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?Z$/;
const OFFSET_SAMPLE_HOURS = [-48, -36, -24, -12, 0, 12, 24, 36, 48] as const;

export function parseUtcInstant(value: string): UtcInstant | null {
  const match = UTC_INSTANT_PATTERN.exec(value);
  if (!match) return null;
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) return null;
  const expected = `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}`;
  if (instant.toISOString().slice(0, 19) !== expected) return null;
  return instant.toISOString() as UtcInstant;
}

export function localDateTimeToUtc(
  dateValue: string,
  timeValue: string,
  timeZone: string,
): LocalDateTimeConversion {
  const date = parseCalendarDate(dateValue);
  if (!date) return { status: "invalid-date" };
  const time = parseLocalTime(timeValue);
  if (!time) return { status: "invalid-time" };
  if (!isValidTimeZone(timeZone)) return { status: "invalid-time-zone" };

  const requested = localParts(date, time);
  const wallClockAsUtc = Date.UTC(
    requested.year,
    requested.month - 1,
    requested.day,
    requested.hour,
    requested.minute,
  );
  const formatter = partsFormatter(timeZone);
  const candidates = new Set<UtcInstant>();

  for (const hours of OFFSET_SAMPLE_HOURS) {
    const sample = wallClockAsUtc + hours * 60 * 60 * 1000;
    const offset = offsetAt(sample, formatter);
    const candidateTime = wallClockAsUtc - offset;
    if (sameLocalParts(partsAt(candidateTime, formatter), requested)) {
      candidates.add(new Date(candidateTime).toISOString() as UtcInstant);
    }
  }

  const matches = [...candidates].sort();
  if (matches.length === 0) return { status: "nonexistent" };
  if (matches.length > 1) return { status: "ambiguous", candidates: matches };
  return { status: "ok", instant: matches[0] };
}

export function utcInstantToLocal(
  value: string,
  timeZone: string,
): { date: CalendarDate; time: LocalTime } | null {
  const instant = parseUtcInstant(value);
  if (!instant || !isValidTimeZone(timeZone)) return null;
  const parts = partsAt(new Date(instant).getTime(), partsFormatter(timeZone));
  const date = parseCalendarDate(
    `${pad(parts.year, 4)}-${pad(parts.month)}-${pad(parts.day)}`,
  );
  const time = parseLocalTime(`${pad(parts.hour)}:${pad(parts.minute)}`);
  return date && time ? { date, time } : null;
}

export function formatUtcInstant(
  value: UtcInstant,
  locale: string,
  timeZone: string,
): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone });
    return true;
  } catch {
    return false;
  }
}

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function partsAt(value: number, formatter: Intl.DateTimeFormat): DateTimeParts {
  const values = new Map(
    formatter
      .formatToParts(new Date(value))
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  return {
    year: values.get("year") ?? 0,
    month: values.get("month") ?? 0,
    day: values.get("day") ?? 0,
    hour: values.get("hour") ?? 0,
    minute: values.get("minute") ?? 0,
  };
}

function offsetAt(value: number, formatter: Intl.DateTimeFormat): number {
  const parts = partsAt(value, formatter);
  return (
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute) -
    value
  );
}

function localParts(date: CalendarDate, time: LocalTime): DateTimeParts {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return { year, month, day, hour, minute };
}

function sameLocalParts(left: DateTimeParts, right: DateTimeParts): boolean {
  return (
    left.year === right.year &&
    left.month === right.month &&
    left.day === right.day &&
    left.hour === right.hour &&
    left.minute === right.minute
  );
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, "0");
}
