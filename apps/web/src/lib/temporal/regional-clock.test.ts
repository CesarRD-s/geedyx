import assert from "node:assert/strict";
import test from "node:test";
import {
  formatRegionalClock,
  millisecondsUntilNextMinute,
} from "./regional-clock.ts";

test("formats one instant in the effective locale and time zone", () => {
  const instant = new Date("2026-09-13T18:05:42.000Z");
  const honduras = formatRegionalClock(
    instant,
    "es",
    "America/Tegucigalpa",
  );
  const utc = formatRegionalClock(instant, "es", "UTC");

  assert.match(honduras.time, /12:05/);
  assert.match(utc.time, /18:05/);
  assert.doesNotMatch(honduras.time, /42/);
  assert.ok(honduras.date.length > 0);
  assert.ok(honduras.accessibleDateTime.includes(honduras.time));
});

test("schedules the next update at the next minute boundary", () => {
  assert.equal(millisecondsUntilNextMinute(0), 60_000);
  assert.equal(millisecondsUntilNextMinute(1), 59_999);
  assert.equal(millisecondsUntilNextMinute(59_999), 1);
  assert.equal(millisecondsUntilNextMinute(60_000), 60_000);
});
