/**
 * CSV for report rows already on screen. Import-free so
 * `node --experimental-strip-types src/lib/csv.check.ts` can run it.
 */

/** Numbers are gtcd's own values; strings may come from visitors. */
export type CsvCell = string | number;

export type CsvRow = readonly CsvCell[];

// A spreadsheet runs a cell starting with one of these as a formula, and
// paths, titles, referrers and campaign names are visitor-controlled.
const FORMULA_START = /^[=+\-@\t\r]/;

function csvCell(value: CsvCell): string {
  if (typeof value === "number") return String(value);

  const text = FORMULA_START.test(value) ? `'${value}` : value;

  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** RFC 4180: comma-separated, CRLF after every record, quotes doubled. */
export function toCsv(rows: readonly CsvRow[]): string {
  return rows.map((row) => `${row.map(csvCell).join(",")}\r\n`).join("");
}

/**
 * An ASCII-safe file name from parts such as site, report and period, joined
 * by "-". Accents fold to their base letter; other characters become "-".
 */
export function csvFileName(parts: readonly string[]): string {
  const safe = parts
    .map((part) =>
      part
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^A-Za-z0-9._]+/g, "-")
        // ponytail: caps each part, not the whole name; callers pass at most
        // four parts, far below the 255-byte file name limit.
        .slice(0, 60)
        .replace(/^[-.]+|[-.]+$/g, "")
    )
    .filter(Boolean);

  return `${safe.join("-") || "report"}.csv`;
}
