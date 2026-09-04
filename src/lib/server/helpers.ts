/**
 * Get date range in RFC 3339 format with timezone offset.
 * GoatCounter API requires proper ISO 8601 / RFC 3339 date-time strings.
 */
export function getDateRange(preset: string): { start: string; end: string } {
  const now = new Date();

  // Round start to the hour (as required by GoatCounter API)
  const start = getStartTime(now, preset);
  start.setMinutes(0, 0, 0);

  // Round end to the hour
  const end = new Date(now);
  end.setMinutes(59, 59, 999);

  return {
    start: formatRFC3339(start),
    end: formatRFC3339(end),
  };
}

function getStartTime(now: Date, preset: string): Date {
  const start = new Date(now);
  switch (preset) {
    case "today": {
      start.setHours(0, 0, 0, 0);
      break;
    }
    case "7d": {
      start.setDate(start.getDate() - 7);
      break;
    }
    case "30d": {
      start.setDate(start.getDate() - 30);
      break;
    }
    case "90d": {
      start.setDate(start.getDate() - 90);
      break;
    }
    case "month": {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    }
    default: {
      start.setDate(start.getDate() - 7);
      break;
    }
  }
  return start;
}

/**
 * Format a Date as RFC 3339 with timezone offset.
 * Example: "2026-09-02T16:00:00+00:00"
 */
function formatRFC3339(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  const tzOffset = -date.getTimezoneOffset();
  const tzSign = tzOffset >= 0 ? "+" : "-";
  const tzHours = String(Math.floor(Math.abs(tzOffset) / 60)).padStart(2, "0");
  const tzMinutes = String(Math.abs(tzOffset) % 60).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${tzSign}${tzHours}:${tzMinutes}`;
}
