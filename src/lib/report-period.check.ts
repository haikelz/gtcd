/**
 * Runnable self-check for email report periods:
 * `node --experimental-strip-types src/lib/report-period.check.ts`
 */
import assert from "node:assert/strict";
import { isReportDue, latestCompletedPeriod } from "./report-period.ts";

const iso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

// Sunday 2026-10-11, 09:00 local.
const sunday = new Date(2026, 9, 11, 9, 0, 0);

const daily = latestCompletedPeriod("daily", sunday);
assert.equal(iso(daily.start), "2026-10-10");
assert.equal(iso(daily.end), "2026-10-10");
assert.equal(daily.end.getHours(), 23);
assert.equal(iso(daily.previousStart), "2026-10-09");
assert.equal(daily.key, "daily:2026-10-10");

// On Sunday the current week is not complete yet: report Mon 28 Sep–Sun 4 Oct.
const weekly = latestCompletedPeriod("weekly", sunday);
assert.equal(iso(weekly.start), "2026-09-28");
assert.equal(iso(weekly.end), "2026-10-04");
assert.equal(iso(weekly.previousStart), "2026-09-21");
assert.equal(iso(weekly.previousEnd), "2026-09-27");

// Monday 2026-10-12 completes the week of 5–11 Oct.
const monday = new Date(2026, 9, 12, 8, 0, 0);
assert.equal(latestCompletedPeriod("weekly", monday).key, "weekly:2026-10-11");

const biweekly = latestCompletedPeriod("biweekly", monday);
assert.equal(
  (biweekly.end.getTime() - biweekly.start.getTime() + 1) / 86_400_000 > 13,
  true
);
assert.equal(biweekly.start.getDay(), 1);
assert.equal(biweekly.end.getDay(), 0);
assert.ok(biweekly.end < monday);

const monthly = latestCompletedPeriod("monthly", new Date(2026, 0, 3, 10));
assert.equal(iso(monthly.start), "2025-12-01");
assert.equal(iso(monthly.end), "2025-12-31");
assert.equal(iso(monthly.previousStart), "2025-11-01");
assert.equal(iso(monthly.previousEnd), "2025-11-30");

// Due only after 07:00, only once per period, never for "never".
assert.equal(isReportDue("daily", new Date(2026, 9, 11, 6, 59), null), false);
assert.equal(isReportDue("daily", sunday, null), true);
assert.equal(isReportDue("daily", sunday, "daily:2026-10-10"), false);
assert.equal(isReportDue("never", sunday, null), false);

console.log("report-period: all checks passed");
