/**
 * Busiest-hours grid from GoatCounter's `/api/v0/stats/total` hourly buckets.
 *
 * GoatCounter 2.7 stores hits per UTC hour. Before answering, it moves every
 * day's 24 buckets by the API user's timezone offset as it is *now*, rounding
 * half-hour zones up (hit_list.go applyOffset). gtcd's timezone preference is
 * that same user's setting, so the buckets already sit in that timezone,
 * except on days whose offset differs from today's across a DST change: those
 * sit an hour off. This module moves them back. No imports, so
 * busiest-hours.check.ts runs under plain Node.
 */

const HOUR_MS = 3_600_000;

export type HourlyStat = {
  readonly day: string;
  readonly hourly?: readonly number[];
};

/**
 * Seven rows, Monday first, of 24 hourly averages: visits in that hour
 * divided by how often the weekday occurs in the period.
 */
export type HourGrid = readonly (readonly number[])[];

/** GoatCounter's whole-hour form of an offset (hit_list.go applyOffset). */
function wholeHours(minutes: number): number {
  return Math.trunc((minutes % 60 === 0 ? minutes : minutes + 30) / 60);
}

function offsetReader(timezone: string): (instant: number) => number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    hourCycle: "h23",
    minute: "numeric",
    month: "numeric",
    timeZone: timezone,
    year: "numeric",
  });

  return (instant) => {
    const parts: Record<string, number> = {};
    for (const part of formatter.formatToParts(new Date(instant))) {
      if (part.type !== "literal") parts[part.type] = Number(part.value);
    }
    const wall = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute
    );

    return Math.round((wall - Math.floor(instant / 60_000) * 60_000) / 60_000);
  };
}

/** Monday-first weekday index of a UTC-normalized date. */
function weekdayIndex(date: Date): number {
  return (date.getUTCDay() + 6) % 7;
}

/**
 * Average visits per weekday and hour in `timezone`, from GoatCounter's
 * per-day hourly buckets.
 */
export function busiestHours(
  stats: readonly HourlyStat[],
  timezone: string,
  now: number = Date.now()
): HourGrid {
  const offsetAt = offsetReader(timezone);
  const applied = wholeHours(offsetAt(now));
  const sums = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  const occurrences = Array<number>(7).fill(0);

  for (const stat of stats) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(stat.day);
    if (!match) continue;

    const midnight = Date.UTC(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3])
    );
    // ponytail: one offset per day, read at its noon. On a DST transition
    // day the hours before the switch stay an hour off; reading the offset
    // per bucket fixes that at 24× the Intl calls.
    const shift =
      wholeHours(offsetAt(midnight + (12 - applied) * HOUR_MS)) - applied;

    occurrences[weekdayIndex(new Date(midnight))] += 1;
    for (let hour = 0; hour < 24; hour++) {
      const visits = stat.hourly?.[hour] ?? 0;
      if (!visits) continue;

      const local = new Date(midnight + (hour + shift) * HOUR_MS);
      sums[weekdayIndex(local)][local.getUTCHours()] += visits;
    }
  }

  // A shift can carry an hour onto a weekday the period never reaches;
  // count it once rather than drop it.
  return sums.map((row, weekday) =>
    row.map((sum) => sum / Math.max(occurrences[weekday], 1))
  );
}
