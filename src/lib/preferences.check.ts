/**
 * Runnable self-check for display preferences:
 * `node --experimental-strip-types src/lib/preferences.check.ts`
 */
import assert from "node:assert/strict";
import {
  formatDate,
  formatHour,
  formatNumber,
  parseTimezone,
  toDisplayPreferences,
  toZonedRFC3339,
  wallClockNow,
} from "./preferences.ts";

assert.equal(parseTimezone("ID.Asia/Jakarta"), "Asia/Jakarta");
assert.equal(parseTimezone(".UTC"), "UTC");
assert.equal(parseTimezone("Not/AZone"), "UTC");
assert.equal(parseTimezone(undefined), "UTC");

// Midnight in Jakarta is 17:00 UTC the day before.
const jakartaMidnight = new Date(2026, 9, 4, 0, 0, 0);
assert.equal(
  toZonedRFC3339(jakartaMidnight, "Asia/Jakarta"),
  "2026-10-04T00:00:00+07:00"
);

// New York switches from EDT (-04:00) to EST (-05:00) on 2026-11-01.
assert.equal(
  toZonedRFC3339(new Date(2026, 9, 31, 23, 59, 59), "America/New_York"),
  "2026-10-31T23:59:59-04:00"
);
assert.equal(
  toZonedRFC3339(new Date(2026, 10, 1, 12, 0, 0), "America/New_York"),
  "2026-11-01T12:00:00-05:00"
);

// 2026-10-03T20:30Z is already Oct 4 in Jakarta.
const wall = wallClockNow("Asia/Jakarta", new Date("2026-10-03T20:30:00Z"));
assert.equal(wall.getDate(), 4);
assert.equal(wall.getHours(), 3);

assert.deepEqual(
  toDisplayPreferences({
    date_format: "2006-01-02",
    number_format: 44,
    timezone: "ID.Asia/Jakarta",
    twenty_four_hours: true,
  }),
  {
    dateFormat: "2006-01-02",
    numberSeparator: ",",
    timezone: "Asia/Jakarta",
    twentyFourHours: true,
  }
);
assert.equal(toDisplayPreferences({ number_format: 999 }).numberSeparator, " ");
assert.equal(toDisplayPreferences(null).dateFormat, "2 Jan ’06");

assert.equal(formatNumber(1234567, ","), "1,234,567");
assert.equal(formatNumber(1234.5, "."), "1.234,5");
assert.equal(formatNumber(42123, ""), "42123");
assert.equal(formatNumber(-987, ","), "-987");

const day = new Date(2026, 9, 4);
assert.equal(formatDate(day, "2006-01-02"), "2026-10-04");
assert.equal(formatDate(day, "02-01-2006", "short"), "04-10");
assert.equal(formatDate(day, "01/02/06"), "10/04/26");
assert.equal(formatDate(day, "2 Jan ’06"), "4 Oct ’26");
assert.equal(formatDate(day, "Mon Jan 2 2006"), "Sun Oct 4 2026");

assert.equal(formatHour(0, false), "12 AM");
assert.equal(formatHour(14, false), "2 PM");
assert.equal(formatHour(9, true), "09:00");

console.log("preferences: all checks passed");
