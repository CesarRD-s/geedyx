import assert from "node:assert/strict";
import test from "node:test";
import {
  compareCalendarDates,
  formatCalendarDate,
  isValidDateRange,
  parseCalendarDate,
  parseLocalTime,
} from "./calendar.ts";

test("calendar dates reject normalized and malformed values", () => {
  assert.equal(parseCalendarDate("2026-02-29"), null);
  assert.equal(parseCalendarDate("2026-2-09"), null);
  assert.equal(parseCalendarDate("2024-02-29"), "2024-02-29");
});

test("local times use a minute-precision 24-hour contract", () => {
  assert.equal(parseLocalTime("00:00"), "00:00");
  assert.equal(parseLocalTime("23:59"), "23:59");
  assert.equal(parseLocalTime("24:00"), null);
  assert.equal(parseLocalTime("12:30:00"), null);
});

test("date ranges are inclusive and ordered", () => {
  assert.equal(isValidDateRange("2026-09-13", "2026-09-13"), true);
  assert.equal(isValidDateRange("2026-09-14", "2026-09-13"), false);
  const first = parseCalendarDate("2026-09-13");
  const second = parseCalendarDate("2026-09-14");
  assert.ok(first && second);
  assert.equal(compareCalendarDates(first, second), -1);
});

test("formatting preserves the selected calendar day in every host time zone", () => {
  const date = parseCalendarDate("2026-09-13");
  assert.ok(date);
  assert.match(formatCalendarDate(date, "en"), /Sep 13, 2026/);
  assert.match(formatCalendarDate(date, "es"), /13 sept 2026/);
});
