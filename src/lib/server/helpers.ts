import { fromDayString, presetRange } from "$lib/period.js";
import { toZonedRFC3339, wallClockNow } from "$lib/preferences.js";

export type DateRange = {
  /** RFC 3339 boundaries for the GoatCounter API. */
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
  if (!start || !end) throw new Error("Choose a valid start and end date.");
  if (start > end) {
    throw new Error("The end date must be on or after the start date.");
  }

  end.setHours(23, 59, 59, 999);
  return toDateRange("custom", start, end, timezone);
}

/** Convert wall-clock boundaries to API strings in `timezone`. */
export function toDateRange(
  range: string,
  startWall: Date,
  endWall: Date,
  timezone: string
): DateRange {
  return {
    end: toZonedRFC3339(endWall, timezone),
    endWall,
    range,
    start: toZonedRFC3339(startWall, timezone),
    startWall,
  };
}

export function getOffsetFromUrl(url: URL): number {
  const value = url.searchParams.get("offset");
  if (!value) return 0;
  if (!/^\d+$/.test(value)) {
    throw new Error("Choose a valid report page.");
  }

  const offset = Number(value);
  if (!Number.isSafeInteger(offset) || offset < 0) {
    throw new Error("Choose a valid report page.");
  }

  return offset;
}
