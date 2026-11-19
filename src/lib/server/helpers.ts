import {
  fromDayString,
  MAX_RANGE_DAYS,
  presetRange,
  rangeDays,
} from "$lib/period.js";
import { toUtcRFC3339, wallClockNow } from "$lib/preferences.js";
import { error } from "@sveltejs/kit";

export type DateRange = {
  /** RFC 3339 UTC boundaries for the GoatCounter API. */
  readonly end: string;
  /** Wall-clock boundaries in the user's timezone, for further calendar math. */
  readonly endWall: Date;
  readonly range: string;
  readonly start: string;
  readonly startWall: Date;
};

/**
 * Resolve the report range from the URL in the user's GoatCounter timezone.
 * Presets follow GoatCounter's period semantics (start of day one period back
 * through the end of today), shared with the client toolbar via $lib/period.
 */
export function getDateRangeFromUrl(url: URL, timezone = "UTC"): DateRange {
  const startDate = url.searchParams.get("start");
  const endDate = url.searchParams.get("end");

  if (!startDate && !endDate) {
    const range = url.searchParams.get("range") || "7d";
    const { start, end } = presetRange(range, wallClockNow(timezone));

    return toDateRange(range, start, end, timezone);
  }

  const start = startDate ? fromDayString(startDate) : null;
  const end = endDate ? fromDayString(endDate) : null;
  if (!start || !end) throw error(400, "Choose a valid start and end date.");
  if (start > end) {
    throw error(400, "The end date must be on or after the start date.");
  }
  // A longer range can take more memory than gtcd's pod has.
  if (rangeDays(start, end) > MAX_RANGE_DAYS) {
    throw error(400, "Choose a range of at most one year.");
  }

  end.setHours(23, 59, 59, 999);
  return toDateRange("custom", start, end, timezone);
}

/**
 * Convert wall-clock boundaries in `timezone` to the UTC instants GoatCounter
 * reads, as its own dashboard sends them.
 *
 * ponytail: GoatCounter then regroups hours by the user's current whole-hour
 * offset. Half-hour zones round to the next hour, and a range crossing a DST
 * change shifts by today's offset, so there `total` can differ from the sum
 * of the daily counts by an hour. Fixing that needs GoatCounter itself to
 * group by zone.
 */
export function toDateRange(
  range: string,
  startWall: Date,
  endWall: Date,
  timezone: string
): DateRange {
  return {
    end: toUtcRFC3339(endWall, timezone),
    endWall,
    range,
    start: toUtcRFC3339(startWall, timezone),
    startWall,
  };
}

export function getOffsetFromUrl(url: URL): number {
  const value = url.searchParams.get("offset");
  if (!value) return 0;
  if (!/^\d+$/.test(value)) {
    throw error(400, "Choose a valid report page.");
  }

  const offset = Number(value);
  if (!Number.isSafeInteger(offset) || offset < 0) {
    throw error(400, "Choose a valid report page.");
  }

  return offset;
}
