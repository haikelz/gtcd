/**
 * Per-user dashboard layout: saved report views, overview widget order,
 * visibility and options, and display overrides. Shared by the server store
 * and the client UI. GoatCounter's API exposes its own views and widgets
 * read-only, so gtcd seeds its copy from them once and keeps it after that.
 */
import type { MessageKey, MessageParams } from "./i18n/index";

export const WIDGET_IDS = [
  "kpis",
  "traffic",
  "browsers",
  "pages",
  "locations",
  "referrers",
  "campaigns",
  "systems",
  "languages",
  "sizes",
] as const;

export type WidgetId = (typeof WIDGET_IDS)[number];

/** Message keys for widget names; translate with `t` or `translate`. */
export const WIDGET_LABEL_KEYS = {
  browsers: "customize.widgetBrowsers",
  campaigns: "customize.widgetCampaigns",
  kpis: "customize.widgetKpis",
  languages: "customize.widgetLanguages",
  locations: "customize.widgetLocations",
  pages: "customize.widgetPages",
  referrers: "customize.widgetReferrers",
  sizes: "customize.widgetSizes",
  systems: "customize.widgetSystems",
  traffic: "customize.widgetTraffic",
} as const satisfies Record<WidgetId, MessageKey>;

export const LOCALES = ["en", "id"] as const;

export type Locale = (typeof LOCALES)[number];

export const CHART_STYLES = ["line", "bar", "text"] as const;

export type ChartStyle = (typeof CHART_STYLES)[number];

export type WidgetOptions = {
  readonly limit?: number;
  readonly style?: ChartStyle;
};

type WidgetOptionSpec = {
  readonly limit?: {
    readonly default: number;
    readonly max: number;
    readonly min: number;
  };
  readonly styles?: readonly ChartStyle[];
};

/** Options each widget accepts, mirroring GoatCounter's widget settings. */
export const WIDGET_OPTION_SPECS: Record<WidgetId, WidgetOptionSpec> = {
  browsers: {},
  campaigns: { limit: { default: 6, max: 20, min: 1 } },
  kpis: {},
  languages: { limit: { default: 6, max: 20, min: 1 } },
  locations: { limit: { default: 6, max: 20, min: 1 } },
  pages: {
    limit: { default: 6, max: 100, min: 1 },
    styles: ["line", "bar", "text"],
  },
  referrers: { limit: { default: 6, max: 20, min: 1 } },
  sizes: {},
  systems: { limit: { default: 6, max: 20, min: 1 } },
  traffic: { styles: ["line", "bar"] },
};

/** Report query parameters a saved view may carry. */
export const VIEW_PARAMS = [
  "range",
  "start",
  "end",
  "filter",
  "group",
  "scale",
  "site",
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
  readonly options: WidgetOptions;
};

/** Per-user overrides of GoatCounter's display settings; null follows GoatCounter. */
export type DisplayOverrides = {
  readonly fewerNumbers: boolean | null;
  readonly locale: Locale | null;
};

export type DashboardLayout = {
  readonly defaultView: string | null;
  readonly overrides: DisplayOverrides;
  readonly views: readonly SavedView[];
  readonly widgets: readonly WidgetSetting[];
};

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = {
  defaultView: null,
  overrides: { fewerNumbers: null, locale: null },
  views: [],
  widgets: WIDGET_IDS.map((id) => ({ hidden: false, id, options: {} })),
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isWidgetId(value: unknown): value is WidgetId {
  return WIDGET_IDS.some((id) => id === value);
}

export function isLocale(value: unknown): value is Locale {
  return LOCALES.some((locale) => locale === value);
}

/** Keep only report parameters, in a stable order. */
export function sanitizeViewQuery(query: string): string {
  const source = new URLSearchParams(query);
  const target = new URLSearchParams();

  for (const key of VIEW_PARAMS) {
    const value = source.get(key)?.trim();
    if (
      key === "site" &&
      (!value ||
        !/^\d+$/.test(value) ||
        !Number.isSafeInteger(Number(value)) ||
        Number(value) < 1)
    )
      continue;
    if (value && value.length <= 200) target.set(key, value);
  }

  return target.toString();
}

export function sanitizeViewName(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const name = value.replace(/\s+/g, " ").trim();
  return name && name.length <= MAX_VIEW_NAME_LENGTH ? name : null;
}

/** Keep only options the widget supports, clamped to their ranges. */
export function sanitizeWidgetOptions(
  id: WidgetId,
  value: unknown
): WidgetOptions {
  if (!isRecord(value)) return {};

  const spec = WIDGET_OPTION_SPECS[id];
  const options: { limit?: number; style?: ChartStyle } = {};
  const limit = Number(value.limit);

  if (spec.limit && Number.isInteger(limit)) {
    options.limit = Math.min(spec.limit.max, Math.max(spec.limit.min, limit));
  }
  if (spec.styles?.some((style) => style === value.style)) {
    options.style = value.style as ChartStyle;
  }

  return options;
}

/** The option value in effect, falling back to the widget default. */
export function widgetLimit(layout: DashboardLayout, id: WidgetId): number {
  const setting = layout.widgets.find((widget) => widget.id === id);
  return setting?.options.limit ?? WIDGET_OPTION_SPECS[id].limit?.default ?? 6;
}

export function widgetStyle(layout: DashboardLayout, id: WidgetId): ChartStyle {
  const setting = layout.widgets.find((widget) => widget.id === id);
  return (
    setting?.options.style ?? WIDGET_OPTION_SPECS[id].styles?.[0] ?? "line"
  );
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
      widgets.push({
        hidden: entry.hidden === true,
        id: entry.id,
        options: sanitizeWidgetOptions(entry.id, entry.options),
      });
    }
  }

  for (const id of WIDGET_IDS) {
    if (!seen.has(id)) widgets.push({ hidden: false, id, options: {} });
  }

  return widgets;
}

function parseOverrides(value: unknown): DisplayOverrides {
  if (!isRecord(value)) return DEFAULT_DASHBOARD_LAYOUT.overrides;

  return {
    fewerNumbers:
      typeof value.fewerNumbers === "boolean" ? value.fewerNumbers : null,
    locale: isLocale(value.locale) ? value.locale : null,
  };
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
    overrides: parseOverrides(value.overrides),
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

/** GoatCounter widget names and the gtcd widget each maps to. */
const GOATCOUNTER_WIDGETS: Record<string, WidgetId> = {
  browsers: "browsers",
  campaigns: "campaigns",
  languages: "languages",
  locations: "locations",
  pages: "pages",
  sizes: "sizes",
  systems: "systems",
  toprefs: "referrers",
  totalpages: "traffic",
};

const GOATCOUNTER_GROUPS = ["hour", "day", "week", "month"] as const;

const GOATCOUNTER_PERIODS = new Set([
  "day",
  "week",
  "month",
  "quarter",
  "half-year",
  "year",
]);

export const IMPORTED_VIEW_NAME = "GoatCounter default";

/**
 * Seed a layout from GoatCounter user settings (`/me` → user.settings):
 * widget order, visibility and options, plus its "default" view when it
 * differs from GoatCounter's own default (last week, no filter, hourly).
 * Returns null when the settings carry nothing to import.
 */
export function layoutFromGoatCounter(
  settings: unknown
): DashboardLayout | null {
  if (!isRecord(settings)) return null;

  let widgets: readonly WidgetSetting[] = DEFAULT_DASHBOARD_LAYOUT.widgets;
  if (Array.isArray(settings.widgets) && settings.widgets.length > 0) {
    const imported: WidgetSetting[] = [
      { hidden: false, id: "kpis", options: {} },
    ];

    for (const entry of settings.widgets) {
      if (!isRecord(entry) || typeof entry.n !== "string") continue;

      const id = GOATCOUNTER_WIDGETS[entry.n];
      if (!id || imported.some((widget) => widget.id === id)) continue;

      const s = isRecord(entry.s) ? entry.s : {};
      imported.push({
        hidden: false,
        id,
        options: sanitizeWidgetOptions(id, {
          limit: id === "pages" ? s.limit_pages : s.limit,
          style: s.style,
        }),
      });
    }

    // Widgets the user removed in GoatCounter start hidden here.
    widgets = normalizeWidgets(imported).map((widget) =>
      imported.some((entry) => entry.id === widget.id)
        ? widget
        : { ...widget, hidden: true }
    );
  }

  const views: SavedView[] = [];
  const view = Array.isArray(settings.views)
    ? settings.views.find(
        (entry) => isRecord(entry) && entry.name === "default"
      )
    : undefined;
  if (isRecord(view)) {
    const params = new URLSearchParams();
    const period = typeof view.period === "string" ? view.period : "week";
    const group =
      typeof view.group === "number" ? GOATCOUNTER_GROUPS[view.group] : null;
    const filter = typeof view.filter === "string" ? view.filter.trim() : "";

    if (GOATCOUNTER_PERIODS.has(period) && period !== "week") {
      params.set("range", period);
    }
    if (filter) params.set("filter", filter);
    if (group && group !== "hour") params.set("group", group);

    if (params.size > 0) {
      views.push({
        name: IMPORTED_VIEW_NAME,
        query: sanitizeViewQuery(params.toString()),
      });
    }
  }

  if (widgets === DEFAULT_DASHBOARD_LAYOUT.widgets && views.length === 0) {
    return null;
  }

  return {
    ...DEFAULT_DASHBOARD_LAYOUT,
    defaultView: views.length > 0 ? IMPORTED_VIEW_NAME : null,
    views,
    widgets,
  };
}

const RANGE_KEYS: Record<string, MessageKey> = {
  "30d": "customize.viewRange30d",
  "7d": "customize.viewRangeWeek",
  "90d": "customize.viewRange90d",
  day: "customize.viewRangeToday",
  "half-year": "customize.viewRangeHalfYear",
  month: "customize.viewRangeMonth",
  quarter: "customize.viewRangeQuarter",
  today: "customize.viewRangeToday",
  week: "customize.viewRangeWeek",
  year: "customize.viewRangeYear",
};

const GROUP_KEYS: Record<string, MessageKey> = {
  day: "customize.viewGroupDay",
  hour: "customize.viewGroupHour",
  month: "customize.viewGroupMonth",
  week: "customize.viewGroupWeek",
};

export type ViewQueryPart = {
  readonly key: MessageKey;
  readonly params?: MessageParams;
};

/**
 * Plain-language summary of a saved query as message keys, e.g.
 * [{ key: "customize.viewRangeMonth" }] ("Period: last month").
 */
export function describeViewQuery(query: string): ViewQueryPart[] {
  const params = new URLSearchParams(query);
  const parts: ViewQueryPart[] = [];
  const range = params.get("range");
  const start = params.get("start");
  const end = params.get("end");
  const filter = params.get("filter");
  const group = params.get("group");
  const site = params.get("site");

  if (site) parts.push({ key: "customize.viewSite", params: { site } });

  if (start && end) {
    parts.push({ key: "customize.viewPeriodCustom", params: { end, start } });
  } else if (range) {
    const key = RANGE_KEYS[range];
    parts.push(
      key ? { key } : { key: "customize.viewPeriodOther", params: { range } }
    );
  }
  if (filter) parts.push({ key: "customize.viewFilter", params: { filter } });
  if (group) {
    const key = GROUP_KEYS[group];
    parts.push(
      key ? { key } : { key: "customize.viewGroupOther", params: { group } }
    );
  }
  if (params.get("scale") === "shared") {
    parts.push({ key: "customize.viewSharedScale" });
  }

  return parts.length > 0 ? parts : [{ key: "customize.viewDefaultPeriod" }];
}
