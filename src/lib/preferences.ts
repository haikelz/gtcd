/**
 * Display preferences mirrored from the GoatCounter user settings returned by
 * `/api/v0/me`: timezone, date format, thousands separator and clock style.
 *
 * Calendar math works on "wall-clock" dates: `Date` objects whose local
 * fields (year…second) hold the time as read on a clock in the user's
 * timezone. Only the final API boundary converts them to an instant with
 * that timezone's offset, so ranges match GoatCounter's own dashboard no
 * matter which timezone the server or browser runs in.
 */

import type { Locale } from "./dashboard-layout";

export const DATE_FORMATS = [
  "2006-01-02",
  "02-01-2006",
  "01/02/06",
  "2 Jan ’06",
  "Mon Jan 2 2006",
] as const;

export type DateFormat = (typeof DATE_FORMATS)[number];

export type DisplayPreferences = {
  readonly dateFormat: DateFormat;
  /** Hide absolute counts and keep shapes and shares (GoatCounter "fewer numbers"). */
  readonly fewerNumbers: boolean;
  /** GoatCounter locks fewer-numbers mode on until a date; gtcd must not undo it. */
  readonly fewerNumbersLocked: boolean;
  /** GoatCounter interface language, e.g. "en-GB" or "id-ID". */
  readonly language: string;
  /** gtcd interface language: the user's override, else GoatCounter's. */
  readonly locale: Locale;
  readonly numberSeparator: string;
  readonly timezone: string;
  readonly twentyFourHours: boolean;
};

/** GoatCounter's own defaults (UserSettings.Defaults). */
export const DEFAULT_DISPLAY_PREFERENCES: DisplayPreferences = {
  dateFormat: "2 Jan ’06",
  fewerNumbers: false,
  fewerNumbersLocked: false,
  language: "en-GB",
  locale: "en",
  numberSeparator: " ",
  timezone: "UTC",
  twentyFourHours: false,
};

/** Thousands separators GoatCounter offers, keyed by Unicode code point. */
const NUMBER_SEPARATORS: Record<number, string> = {
  1: "",
  39: "'",
  44: ",",
  46: ".",
  160: " ",
  8239: " ",
};

const MONTHS: Record<Locale, readonly string[]> = {
  en: [
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
  ],
  id: [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ],
};

const MONTHS_LONG: Record<Locale, readonly string[]> = {
  en: [
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
  ],
  id: [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ],
};

const WEEKDAYS: Record<Locale, readonly string[]> = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  id: ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"],
};

/** A month name in the interface language, short ("Okt") or long ("Oktober"). */
export function monthName(
  month: number,
  locale: Locale = "en",
  variant: "short" | "long" = "short"
): string {
  return (variant === "long" ? MONTHS_LONG : MONTHS)[locale][month];
}

/** GoatCounter language tags ("id-ID", "en-GB") mapped to a gtcd locale. */
export function localeFromLanguage(
  language: string | null | undefined
): Locale {
  return language?.toLowerCase().startsWith("id") ? "id" : "en";
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function pad(value: number, length = 2): string {
  return String(value).padStart(length, "0");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/**
 * GoatCounter serializes zones as "<country>.<IANA zone>", e.g.
 * "ID.Asia/Jakarta"; UTC has an empty country (".UTC" or "UTC").
 */
export function parseTimezone(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "UTC";

  const raw = value.trim();
  const dot = raw.indexOf(".");
  const zone = dot >= 0 && dot <= 2 ? raw.slice(dot + 1) : raw;

  return zone && isTimezone(zone) ? zone : "UTC";
}

/** Validate the untrusted settings object from `/me`. */
export function toDisplayPreferences(
  settings: unknown,
  now: Date = new Date()
): DisplayPreferences {
  if (!isRecord(settings)) return DEFAULT_DISPLAY_PREFERENCES;

  const lockUntil =
    typeof settings.fewer_numbers_lock_until === "string"
      ? Date.parse(settings.fewer_numbers_lock_until)
      : Number.NaN;
  const fewerNumbersLocked =
    settings.fewer_numbers === true &&
    Number.isFinite(lockUntil) &&
    lockUntil > now.getTime();

  const dateFormat = DATE_FORMATS.find(
    (format) => format === settings.date_format
  );
  const separatorCode =
    typeof settings.number_format === "number"
      ? settings.number_format
      : typeof settings.number_format === "string"
        ? Number(settings.number_format)
        : Number.NaN;

  return {
    dateFormat: dateFormat ?? DEFAULT_DISPLAY_PREFERENCES.dateFormat,
    fewerNumbers: settings.fewer_numbers === true,
    fewerNumbersLocked,
    language:
      typeof settings.language === "string" && settings.language
        ? settings.language
        : DEFAULT_DISPLAY_PREFERENCES.language,
    locale: localeFromLanguage(
      typeof settings.language === "string" ? settings.language : null
    ),
    numberSeparator:
      NUMBER_SEPARATORS[separatorCode] ??
      DEFAULT_DISPLAY_PREFERENCES.numberSeparator,
    timezone: parseTimezone(settings.timezone),
    twentyFourHours: settings.twenty_four_hours === true,
  };
}

/**
 * Apply a user's gtcd overrides (null follows GoatCounter). Fewer-numbers
 * mode stays on while GoatCounter locks it.
 */
export function applyDisplayOverrides(
  preferences: DisplayPreferences,
  overrides: {
    readonly fewerNumbers: boolean | null;
    readonly locale: Locale | null;
  }
): DisplayPreferences {
  return {
    ...preferences,
    fewerNumbers:
      preferences.fewerNumbersLocked || overrides.fewerNumbers === null
        ? preferences.fewerNumbers
        : overrides.fewerNumbers,
    locale: overrides.locale ?? preferences.locale,
  };
}

function zonedParts(timezone: string, instant: Date) {
  let formatter = formatters.get(timezone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
      minute: "2-digit",
      month: "2-digit",
      second: "2-digit",
      timeZone: timezone,
      year: "numeric",
    });
    formatters.set(timezone, formatter);
  }

  const parts: Record<string, number> = {};
  for (const part of formatter.formatToParts(instant)) {
    if (part.type !== "literal") parts[part.type] = Number(part.value);
  }

  return {
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    month: parts.month,
    second: parts.second,
    year: parts.year,
  };
}

/** The current time as a wall-clock date in `timezone`. */
export function wallClockNow(timezone: string, now: Date = new Date()): Date {
  const parts = zonedParts(timezone, now);

  return new Date(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
}

/** Minutes east of UTC for `timezone` at an instant. */
function offsetMinutes(timezone: string, instant: number): number {
  const wholeSecond = Math.floor(instant / 1000) * 1000;
  const parts = zonedParts(timezone, new Date(wholeSecond));
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );

  return Math.round((asUtc - wholeSecond) / 60_000);
}

/**
 * Format a wall-clock date as RFC 3339 with `timezone`'s offset at that
 * moment, e.g. "2026-10-04T00:00:00+07:00".
 */
export function toZonedRFC3339(wall: Date, timezone: string): string {
  const wallAsUtc = Date.UTC(
    wall.getFullYear(),
    wall.getMonth(),
    wall.getDate(),
    wall.getHours(),
    wall.getMinutes(),
    wall.getSeconds()
  );
  // Second pass corrects the guess when a DST change falls between the
  // wall time read as UTC and the real instant.
  const firstGuess = offsetMinutes(timezone, wallAsUtc);
  const offset = offsetMinutes(timezone, wallAsUtc - firstGuess * 60_000);
  const sign = offset >= 0 ? "+" : "-";
  const absolute = Math.abs(offset);

  return (
    `${wall.getFullYear()}-${pad(wall.getMonth() + 1)}-${pad(wall.getDate())}` +
    `T${pad(wall.getHours())}:${pad(wall.getMinutes())}:${pad(wall.getSeconds())}` +
    `${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`
  );
}

/** Group digits with the user's thousands separator. */
export function formatNumber(value: number, separator: string): string {
  if (!Number.isFinite(value)) return "—";

  const [integer, fraction] = Math.abs(value).toString().split(".");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  const decimalMark = separator === "." ? "," : ".";

  return `${value < 0 ? "-" : ""}${grouped}${fraction ? decimalMark + fraction : ""}`;
}

/** A calendar date in the user's format; `short` drops the year. */
export function formatDate(
  date: Date,
  format: DateFormat,
  variant: "full" | "short" = "full",
  locale: Locale = "en"
): string {
  const months = MONTHS[locale];
  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();
  const short = variant === "short";

  switch (format) {
    case "2006-01-02":
      return short
        ? `${pad(month + 1)}-${pad(day)}`
        : `${year}-${pad(month + 1)}-${pad(day)}`;
    case "02-01-2006":
      return short
        ? `${pad(day)}-${pad(month + 1)}`
        : `${pad(day)}-${pad(month + 1)}-${year}`;
    case "01/02/06":
      return short
        ? `${pad(month + 1)}/${pad(day)}`
        : `${pad(month + 1)}/${pad(day)}/${pad(year % 100)}`;
    case "Mon Jan 2 2006":
      return short
        ? `${months[month]} ${day}`
        : `${WEEKDAYS[locale][date.getDay()]} ${months[month]} ${day} ${year}`;
    case "2 Jan ’06":
      return short
        ? `${day} ${months[month]}`
        : `${day} ${months[month]} ’${pad(year % 100)}`;
  }
}

/** An hour of the day, "14:00" or "2 PM". */
export function formatHour(hour: number, twentyFourHours: boolean): string {
  if (twentyFourHours) return `${pad(hour)}:00`;

  const suffix = hour < 12 ? "AM" : "PM";
  return `${hour % 12 === 0 ? 12 : hour % 12} ${suffix}`;
}
