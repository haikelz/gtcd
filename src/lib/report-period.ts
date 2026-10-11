/**
 * Email report periods. Calendar math runs on wall-clock dates in the user's
 * timezone (see $lib/preferences); each frequency maps to its latest
 * *completed* period, identified by a key. A report is due when that key
 * differs from the last one sent, which also catches up after downtime.
 */

export const REPORT_FREQUENCIES = [
  "never",
  "daily",
  "weekly",
  "biweekly",
  "monthly",
] as const;

export type ReportFrequency = (typeof REPORT_FREQUENCIES)[number];

export type ReportPeriod = {
  readonly end: Date;
  /** Stable identifier of the period, e.g. "weekly:2026-10-11". */
  readonly key: string;
  readonly previousEnd: Date;
  readonly previousStart: Date;
  readonly start: Date;
};

/** Reports go out once the user's local day has started properly. */
export const REPORT_SEND_HOUR = 7;

// Monday 2024-01-01 anchors the two-week blocks.
const BIWEEKLY_EPOCH = new Date(2024, 0, 1);
const DAY_MS = 86_400_000;

export function isReportFrequency(value: unknown): value is ReportFrequency {
  return REPORT_FREQUENCIES.some((frequency) => frequency === value);
}

function day(year: number, month: number, date: number): Date {
  return new Date(year, month, date);
}

function endOf(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999
  );
}

function addDays(date: Date, days: number): Date {
  return day(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function dayKey(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Whole calendar days between two local midnights (DST-safe). */
function daysBetween(from: Date, to: Date): number {
  return Math.round(
    (Date.UTC(to.getFullYear(), to.getMonth(), to.getDate()) -
      Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())) /
      DAY_MS
  );
}

function span(
  frequency: ReportFrequency,
  start: Date,
  lastDay: Date,
  previousStart: Date
): ReportPeriod {
  return {
    end: endOf(lastDay),
    key: `${frequency}:${dayKey(lastDay)}`,
    previousEnd: endOf(addDays(start, -1)),
    previousStart,
    start,
  };
}

/** The latest completed period for a frequency, given the local "now". */
export function latestCompletedPeriod(
  frequency: Exclude<ReportFrequency, "never">,
  now: Date
): ReportPeriod {
  const today = day(now.getFullYear(), now.getMonth(), now.getDate());

  if (frequency === "daily") {
    const yesterday = addDays(today, -1);
    return span(frequency, yesterday, yesterday, addDays(yesterday, -1));
  }

  if (frequency === "monthly") {
    const start = day(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDay = day(today.getFullYear(), today.getMonth(), 0);
    const previousStart = day(today.getFullYear(), today.getMonth() - 2, 1);
    return span(frequency, start, lastDay, previousStart);
  }

  // Weeks run Monday–Sunday; getDay() is 0 on Sunday.
  const sinceMonday = (today.getDay() + 6) % 7;
  const thisMonday = addDays(today, -sinceMonday);
  const length = frequency === "weekly" ? 7 : 14;

  let start = addDays(thisMonday, -7);
  if (frequency === "biweekly") {
    const blocks = Math.floor(daysBetween(BIWEEKLY_EPOCH, thisMonday) / 14);
    start = addDays(BIWEEKLY_EPOCH, (blocks - 1) * 14);
  }

  return span(
    frequency,
    start,
    addDays(start, length - 1),
    addDays(start, -length)
  );
}

/** Whether a report is due now for a subscription's last sent period key. */
export function isReportDue(
  frequency: ReportFrequency,
  now: Date,
  lastPeriodKey: string | null
): boolean {
  if (frequency === "never" || now.getHours() < REPORT_SEND_HOUR) return false;

  return latestCompletedPeriod(frequency, now).key !== lastPeriodKey;
}
