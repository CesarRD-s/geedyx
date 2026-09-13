import assert from "node:assert/strict";
import test from "node:test";
import {
  formatUtcInstant,
  localDateTimeToUtc,
  parseUtcInstant,
  utcInstantToLocal,
} from "./instant.ts";

test("UTC instants require an explicit Z suffix and valid components", () => {
  assert.equal(
    parseUtcInstant("2026-09-13T15:30:00Z"),
    "2026-09-13T15:30:00.000Z",
  );
  assert.equal(parseUtcInstant("2026-09-13T15:30:00"), null);
  assert.equal(parseUtcInstant("2026-02-30T15:30:00Z"), null);
});

test("local time converts through an explicit IANA zone and round trips", () => {
  const result = localDateTimeToUtc(
    "2026-09-13",
    "09:30",
    "America/Tegucigalpa",
  );
  assert.deepEqual(result, {
    status: "ok",
    instant: "2026-09-13T15:30:00.000Z",
  });
  assert.deepEqual(
    utcInstantToLocal("2026-09-13T15:30:00.000Z", "America/Tegucigalpa"),
    { date: "2026-09-13", time: "09:30" },
  );
});

test("DST gaps and overlaps are never resolved silently", () => {
  assert.deepEqual(
    localDateTimeToUtc("2026-03-08", "02:30", "America/New_York"),
    { status: "nonexistent" },
  );
  const overlap = localDateTimeToUtc("2026-11-01", "01:30", "America/New_York");
  assert.equal(overlap.status, "ambiguous");
  if (overlap.status === "ambiguous") {
    assert.deepEqual(overlap.candidates, [
      "2026-11-01T05:30:00.000Z",
      "2026-11-01T06:30:00.000Z",
    ]);
  }
});

test("invalid local values and zones have distinct results", () => {
  assert.deepEqual(localDateTimeToUtc("bad", "09:30", "UTC"), {
    status: "invalid-date",
  });
  assert.deepEqual(localDateTimeToUtc("2026-09-13", "25:00", "UTC"), {
    status: "invalid-time",
  });
  assert.deepEqual(localDateTimeToUtc("2026-09-13", "09:30", "Invalid/Zone"), {
    status: "invalid-time-zone",
  });
});

test("instant formatting uses the requested locale and time zone", () => {
  const instant = parseUtcInstant("2026-09-13T15:30:00Z");
  assert.ok(instant);
  assert.match(
    formatUtcInstant(instant, "en", "America/Tegucigalpa"),
    /9:30 AM/,
  );
});
