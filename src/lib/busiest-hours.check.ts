import assert from "node:assert/strict";
import { busiestHours } from "./busiest-hours.ts";

function hourly(values: Record<number, number>): number[] {
  return Array.from({ length: 24 }, (_, hour) => values[hour] ?? 0);
}

const WINTER = Date.UTC(2026, 10, 11, 9); // Wed 11 Nov 2026
const SUMMER = Date.UTC(2026, 6, 1, 9); // Wed 1 Jul 2026

// UTC: 9 Nov 2026 is a Monday, so row 0; hour 14 stays hour 14.
const utc = busiestHours(
  [{ day: "2026-11-09", hourly: hourly({ 14: 6 }) }],
  "UTC",
  WINTER
);
assert.equal(utc.length, 7);
assert.ok(utc.every((row) => row.length === 24));
assert.equal(utc[0][14], 6);

// Cells average over each weekday's occurrences in the period.
const twoMondays = busiestHours(
  [
    { day: "2026-11-02", hourly: hourly({ 9: 4 }) },
    { day: "2026-11-03", hourly: hourly({ 9: 5 }) },
    { day: "2026-11-09", hourly: hourly({ 9: 2 }) },
  ],
  "UTC",
  WINTER
);
assert.equal(twoMondays[0][9], 3);
assert.equal(twoMondays[1][9], 5);

// GoatCounter shifts by today's offset (CET, +1). On Tue 20 Oct 2026 Berlin
// was on CEST (+2): a hit at 10:00 UTC arrives in bucket 11 but happened at
// 12:00, and bucket 23 belongs to Wednesday 00:00.
const berlin = busiestHours(
  [{ day: "2026-10-20", hourly: hourly({ 11: 4, 23: 3 }) }],
  "Europe/Berlin",
  WINTER
);
assert.equal(berlin[1][11], 0);
assert.equal(berlin[1][12], 4);
assert.equal(berlin[2][0], 3);

// Days on today's side of the change stay put.
const berlinWinter = busiestHours(
  [{ day: "2026-11-10", hourly: hourly({ 11: 4 }) }],
  "Europe/Berlin",
  WINTER
);
assert.equal(berlinWinter[1][11], 4);

// The other direction: summer (EDT, -4) viewing a winter day (EST, -5).
const newYork = busiestHours(
  [{ day: "2026-12-01", hourly: hourly({ 0: 2, 10: 7 }) }],
  "America/New_York",
  SUMMER
);
assert.equal(newYork[1][9], 7);
assert.equal(newYork[0][23], 2);

// Half-hour zones without DST keep GoatCounter's rounded buckets.
const kolkata = busiestHours(
  [{ day: "2026-10-20", hourly: hourly({ 16: 5 }) }],
  "Asia/Kolkata",
  WINTER
);
assert.equal(kolkata[1][16], 5);

// GoatCounter's "week starts on Sunday" puts Sunday on row 0 and Monday on
// row 1, also for an hour a DST shift carries over: Saturday 24 Oct 2026 was
// still CEST in Berlin, so its bucket 23 belongs to Sunday 00:00.
const sundayFirst = busiestHours(
  [
    { day: "2026-11-08", hourly: hourly({ 10: 2 }) },
    { day: "2026-11-09", hourly: hourly({ 14: 6 }) },
    { day: "2026-10-24", hourly: hourly({ 23: 3 }) },
  ],
  "Europe/Berlin",
  WINTER,
  0
);
assert.equal(sundayFirst[0][10], 2);
assert.equal(sundayFirst[1][14], 6);
assert.equal(sundayFirst[0][0], 3);
assert.equal(sundayFirst[6][23], 0);

// Malformed days and missing hourly arrays contribute nothing.
const sparse = busiestHours(
  [{ day: "not-a-day", hourly: hourly({ 1: 9 }) }, { day: "2026-11-09" }],
  "UTC",
  WINTER
);
assert.ok(sparse.every((row) => row.every((value) => value === 0)));

console.log("busiest-hours: all checks passed");
