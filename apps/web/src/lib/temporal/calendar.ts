export type CalendarDate = string & { readonly __calendarDate: unique symbol };
export type LocalTime = string & { readonly __localTime: unique symbol };

const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function parseCalendarDate(value: string): CalendarDate | null {
  const match = CALENDAR_DATE_PATTERN.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }
  return value as CalendarDate;
}

export function parseLocalTime(value: string): LocalTime | null {
  return LOCAL_TIME_PATTERN.test(value) ? (value as LocalTime) : null;
}

export function compareCalendarDates(
  left: CalendarDate,
  right: CalendarDate,
): number {
  return left.localeCompare(right);
}

export function isValidDateRange(start: string, end: string): boolean {
  const parsedStart = parseCalendarDate(start);
  const parsedEnd = parseCalendarDate(end);
  return Boolean(
    parsedStart &&
    parsedEnd &&
    compareCalendarDates(parsedStart, parsedEnd) <= 0,
  );
}

export function formatCalendarDate(
  value: CalendarDate,
  locale: string,
): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}
