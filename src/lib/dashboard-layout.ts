/**
 * Per-user dashboard layout: saved report views and overview widget order
 * and visibility. Shared by the server store and the client UI; GoatCounter's
 * API exposes its own views/widgets read-only, so gtcd keeps its own copy.
 */

export const WIDGET_IDS = [
  "kpis",
  "traffic",
  "browsers",
  "pages",
  "locations",
  "systems",
  "languages",
  "sizes",
] as const;

export type WidgetId = (typeof WIDGET_IDS)[number];

export const WIDGET_LABELS: Record<WidgetId, string> = {
  browsers: "Browser mix",
  kpis: "Key metrics",
  languages: "Languages",
  locations: "Where visitors are",
  pages: "Most-read pages",
  sizes: "Screen sizes",
  systems: "Operating systems",
  traffic: "Traffic over time",
};

/** Report query parameters a saved view may carry. */
export const VIEW_PARAMS = [
  "range",
  "start",
  "end",
  "filter",
  "group",
  "scale",
] as const;

export const MAX_SAVED_VIEWS = 20;
export const MAX_VIEW_NAME_LENGTH = 40;

export type SavedView = {
  readonly name: string;
  /** Sanitized query string, e.g. "range=month&group=day". */
  readonly query: string;
};

export type WidgetSetting = {
  readonly hidden: boolean;
  readonly id: WidgetId;
};

export type DashboardLayout = {
  readonly defaultView: string | null;
  readonly views: readonly SavedView[];
  readonly widgets: readonly WidgetSetting[];
};

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = {
  defaultView: null,
  views: [],
  widgets: WIDGET_IDS.map((id) => ({ hidden: false, id })),
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isWidgetId(value: unknown): value is WidgetId {
  return WIDGET_IDS.some((id) => id === value);
}

/** Keep only report parameters, in a stable order. */
export function sanitizeViewQuery(query: string): string {
  const source = new URLSearchParams(query);
  const target = new URLSearchParams();

  for (const key of VIEW_PARAMS) {
    const value = source.get(key)?.trim();
    if (value && value.length <= 200) target.set(key, value);
  }

  return target.toString();
}

export function sanitizeViewName(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const name = value.replace(/\s+/g, " ").trim();
  return name && name.length <= MAX_VIEW_NAME_LENGTH ? name : null;
}

/**
 * Complete a widget list: drop unknown or duplicate IDs and append widgets
 * added in newer gtcd versions, so stored layouts never lose a widget.
 */
export function normalizeWidgets(value: unknown): readonly WidgetSetting[] {
  const seen = new Set<WidgetId>();
  const widgets: WidgetSetting[] = [];

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (!isRecord(entry) || !isWidgetId(entry.id) || seen.has(entry.id)) {
        continue;
      }

      seen.add(entry.id);
      widgets.push({ hidden: entry.hidden === true, id: entry.id });
    }
  }

  for (const id of WIDGET_IDS) {
    if (!seen.has(id)) widgets.push({ hidden: false, id });
  }

  return widgets;
}

/** Validate a stored layout; anything malformed falls back to defaults. */
export function parseDashboardLayout(value: unknown): DashboardLayout {
  if (!isRecord(value)) return DEFAULT_DASHBOARD_LAYOUT;

  const views: SavedView[] = [];
  if (Array.isArray(value.views)) {
    for (const entry of value.views) {
      if (!isRecord(entry) || typeof entry.query !== "string") continue;

      const name = sanitizeViewName(entry.name);
      if (!name || views.some((view) => view.name === name)) continue;

      views.push({ name, query: sanitizeViewQuery(entry.query) });
      if (views.length === MAX_SAVED_VIEWS) break;
    }
  }

  const defaultView =
    typeof value.defaultView === "string" &&
    views.some((view) => view.name === value.defaultView)
      ? value.defaultView
      : null;

  return {
    defaultView,
    views,
    widgets: normalizeWidgets(value.widgets),
  };
}

export function isWidgetVisible(
  layout: DashboardLayout,
  id: WidgetId
): boolean {
  return !layout.widgets.find((widget) => widget.id === id)?.hidden;
}

const RANGE_LABELS: Record<string, string> = {
  "30d": "last 30 days",
  "7d": "last week",
  "90d": "last 90 days",
  day: "today",
  "half-year": "last half year",
  month: "last month",
  quarter: "last quarter",
  today: "today",
  week: "last week",
  year: "last year",
};

/** Plain-language summary of a saved query, e.g. ["Period: last month"]. */
export function describeViewQuery(query: string): string[] {
  const params = new URLSearchParams(query);
  const parts: string[] = [];
  const range = params.get("range");
  const start = params.get("start");
  const end = params.get("end");

  if (start && end) parts.push(`Period: ${start} to ${end}`);
  else if (range) parts.push(`Period: ${RANGE_LABELS[range] ?? range}`);
  if (params.get("filter")) parts.push(`Filter: ${params.get("filter")}`);
  if (params.get("group")) parts.push(`View by: ${params.get("group")}`);
  if (params.get("scale") === "shared") parts.push("Shared chart scale");

  return parts.length > 0 ? parts : ["Default period"];
}
