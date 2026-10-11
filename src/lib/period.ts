import {
  DEFAULT_DISPLAY_PREFERENCES,
  type DateFormat,
  type DisplayPreferences,
  formatDate,
  formatHour,
} from "$lib/preferences";
import type { HitListStat } from "$lib/types";

/**
 * Chart grouping, mirroring GoatCounter's "View by" options: hour, day, week
 * or month. Values match the upstream `group` query parameter.
 */
export type Group = "hour" | "day" | "week" | "month";

export const GROUP_LABELS: Record<Group, string> = {
  hour: "Hourly",
  day: "Daily",
  week: "Weekly",
  month: "Monthly",
};

export type MoveUnit = "day" | "week" | "month" | "year";

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY_MS = 86_400_000;

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Add months, clamping the day of month (Mar 31 - 1 month → Feb 28/29). */
function addMonthsClamp(d: Date, n: number): Date {
  const x = new Date(d);
  const day = x.getDate();
  x.setDate(1);
  x.setMonth(x.getMonth() + n);
  const daysInTarget = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate();
  x.setDate(Math.min(day, daysInTarget));
  return x;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Local YYYY-MM-DD for a date (never UTC-shifted). */
export function toDayString(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Parse a YYYY-MM-DD string as a local date; null when invalid. */
export function fromDayString(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date;
}

/**
 * Resolve a period preset to a concrete range, using GoatCounter's
 * semantics: the start is exactly one period back from the start of today
 * (at midnight) and the end is the end of today.
 *
 * Legacy gtcd presets (today/7d/30d/90d) stay supported.
 */
export function presetRange(
  preset: string,
  now: Date = new Date()
): { start: Date; end: Date } {
  const end = endOfDay(now);
  let start = startOfDay(now);

  switch (preset) {
    case "day":
    case "today":
      break;
    case "week":
      start = addDays(start, -7);
      break;
    case "month":
      start = addMonthsClamp(start, -1);
      break;
    case "quarter":
      start = addMonthsClamp(start, -3);
      break;
    case "half-year":
      start = addMonthsClamp(start, -6);
      break;
    case "year":
      start = addMonthsClamp(start, -12);
      break;
    case "30d":
      start = addDays(start, -30);
      break;
    case "90d":
      start = addDays(start, -90);
      break;
    case "7d":
    default:
      start = addDays(start, -7);
      break;
  }

  return { start, end };
}

export interface CurrentRange {
  readonly range: string;
  readonly start: Date;
  readonly end: Date;
  readonly custom: boolean;
}

/**
 * Resolve the visible range from URL parameters: explicit start/end dates win,
 * otherwise the range preset applies (defaulting to the last week).
 */
export function rangeFromParams(
  params: URLSearchParams,
  now: Date = new Date()
): CurrentRange {
  const startStr = params.get("start");
  const endStr = params.get("end");

  if (startStr && endStr) {
    const s = fromDayString(startStr);
    const e = fromDayString(endStr);
    if (s && e && s <= e) {
      return {
        range: "custom",
        start: startOfDay(s),
        end: endOfDay(e),
        custom: true,
      };
    }
  }

  const range = params.get("range") || "7d";
  return { range, ...presetRange(range, now), custom: false };
}

/**
 * Shift the current range by one period in a direction (GoatCounter's
 * dashboard back/forward controls). Returns null when the result would move
 * the range into the future.
 */
export function moveRange(
  start: Date,
  end: Date,
  unit: MoveUnit,
  dir: 1 | -1,
  now: Date = new Date()
): { start: Date; end: Date } | null {
  const s = new Date(start);
  let e = new Date(end);

  switch (unit) {
    case "day":
      s.setDate(s.getDate() + dir);
      e.setDate(e.getDate() + dir);
      break;
    case "week":
      s.setDate(s.getDate() + 7 * dir);
      e.setDate(e.getDate() + 7 * dir);
      break;
    case "month":
      s.setMonth(s.getMonth() + dir);
      e.setMonth(e.getMonth() + dir);
      break;
    case "year":
      s.setFullYear(s.getFullYear() + dir);
      e.setFullYear(e.getFullYear() + dir);
      break;
  }

  // Whole-month ranges that start on the 1st stay whole months when moved.
  if (unit === "month" && s.getDate() === 1) {
    e = new Date(s.getFullYear(), s.getMonth() + 1, 0);
  }

  if (s > e || e.getTime() > endOfDay(now).getTime()) return null;
  return { start: s, end: e };
}

export interface GroupChoice {
  readonly group: Group;
  readonly allow: readonly Group[];
}

/**
 * Which "View by" groupings make sense for a range, mirroring GoatCounter's
 * getGroup(): hour for short ranges, day for long ones, weekly and monthly
 * only once a range is long enough to be readable.
 */
export function groupForRange(
  start: Date,
  end: Date,
  requested?: string | null
): GroupChoice {
  const days = (end.getTime() - start.getTime()) / DAY_MS;

  let allow: readonly Group[];
  if (days <= 6) {
    allow = ["hour"];
  } else if (days >= 364) {
    allow = ["day", "week", "month"];
  } else if (days < 90) {
    allow = ["hour", "day"];
  } else {
    allow = ["day", "week"];
  }

  const group =
    requested && (allow as readonly string[]).includes(requested)
      ? (requested as Group)
      : allow[0];
  return { group, allow };
}

/**
 * The period immediately before a range, with the same number of whole days
 * (used to compute the change against the previous period).
 */
export function previousRange(
  start: Date,
  end: Date
): {
  start: Date;
  end: Date;
} {
  const days =
    Math.round(
      (startOfDay(end).getTime() - startOfDay(start).getTime()) / DAY_MS
    ) + 1;
  const prevEnd = endOfDay(addDays(startOfDay(start), -1));
  const prevStart = startOfDay(addDays(prevEnd, -(days - 1)));
  return { start: prevStart, end: prevEnd };
}

/** Human range label in the user's date format, e.g. "4 Oct ’26 – 11 Oct ’26". */
export function formatRangeLabel(
  start: Date,
  end: Date,
  dateFormat: DateFormat = DEFAULT_DISPLAY_PREFERENCES.dateFormat
): string {
  return `${formatDate(start, dateFormat)} – ${formatDate(end, dateFormat)}`;
}

export interface SeriesPoint {
  readonly value: number;
  /** Short x-axis label, e.g. "09-26", "14:00", "Sep 26". */
  readonly label: string;
  /** Full description for hover readouts and screen-reader tables. */
  readonly title: string;
  /** Whether this point is a good x-axis label position. */
  readonly tick: boolean;
}

function dayTitle(day: string, dateFormat: DateFormat): string {
  const d = fromDayString(day);
  return d ? formatDate(d, dateFormat) : day;
}

function dayLabel(day: string, dateFormat: DateFormat): string {
  const d = fromDayString(day);
  return d ? formatDate(d, dateFormat, "short") : day.slice(5);
}

/**
 * Pick the chart series for a grouping out of GoatCounter's hit stats, the
 * same way the GoatCounter dashboard does: hourly concatenates every hour,
 * daily uses per-day totals, weekly takes every 7th entry and monthly the
 * entries stored on the first of the month.
 */
export function seriesPoints(
  stats: HitListStat[] | undefined,
  group: Group = "day",
  preferences: DisplayPreferences = DEFAULT_DISPLAY_PREFERENCES
): SeriesPoint[] {
  if (!stats || stats.length === 0) return [];

  const { dateFormat, twentyFourHours } = preferences;
  const out: SeriesPoint[] = [];

  if (group === "hour") {
    const dense = stats.length <= 2;
    for (const s of stats) {
      const title = dayTitle(s.day, dateFormat);
      for (let h = 0; h < 24; h++) {
        out.push({
          value: s.hourly?.[h] ?? 0,
          label:
            h === 0
              ? dayLabel(s.day, dateFormat)
              : formatHour(h, twentyFourHours),
          title: `${title}, ${formatHour(h, twentyFourHours)}`,
          tick: h === 0 || (dense && h % 6 === 0),
        });
      }
    }
    return out;
  }

  if (group === "day") {
    for (const s of stats) {
      out.push({
        value: s.daily,
        label: dayLabel(s.day, dateFormat),
        title: dayTitle(s.day, dateFormat),
        tick: true,
      });
    }
    return out;
  }

  if (group === "week") {
    for (let i = 0; i < stats.length; i += 7) {
      const s = stats[i];
      const start = fromDayString(s.day);
      out.push({
        value: s.weekly ?? 0,
        label: dayLabel(s.day, dateFormat),
        title: start
          ? formatRangeLabel(start, addDays(start, 6), dateFormat)
          : dayTitle(s.day, dateFormat),
        tick: true,
      });
    }
    return out;
  }

  for (const s of stats) {
    if (!s.day.endsWith("-01")) continue;
    const d = fromDayString(s.day);
    if (!d) continue;
    out.push({
      value: s.monthly ?? 0,
      label: `${MONTHS_SHORT[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
      title: `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`,
      tick: true,
    });
  }
  return out;
}

/**
 * Shared Y-axis maximum for a list of per-path sparklines, so rows are
 * visually comparable like GoatCounter's dashboard charts.
 */
export function statsScaleMax(
  hits: readonly { stats: HitListStat[] }[],
  group: Group
): number {
  let max = 1;
  for (const hit of hits) {
    for (const p of seriesPoints(hit.stats, group)) {
      if (p.value > max) max = p.value;
    }
  }
  return max;
}
