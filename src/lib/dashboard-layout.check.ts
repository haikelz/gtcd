/**
 * Runnable self-check for dashboard layout parsing and GoatCounter import:
 * `node --experimental-strip-types src/lib/dashboard-layout.check.ts`
 */
import assert from "node:assert/strict";
import {
  DEFAULT_DASHBOARD_LAYOUT,
  IMPORTED_VIEW_NAME,
  layoutFromGoatCounter,
  parseDashboardLayout,
  sanitizeWidgetOptions,
  widgetLimit,
  widgetStyle,
} from "./dashboard-layout.ts";

// Options are clamped to each widget's range and unsupported keys dropped.
assert.deepEqual(sanitizeWidgetOptions("pages", { limit: 500, style: "bar" }), {
  limit: 100,
  style: "bar",
});
assert.deepEqual(sanitizeWidgetOptions("traffic", { style: "text" }), {});
assert.deepEqual(sanitizeWidgetOptions("browsers", { limit: 3 }), {});
assert.deepEqual(sanitizeWidgetOptions("referrers", { limit: 0 }), {
  limit: 1,
});

// Layouts stored before options/overrides existed still parse.
const legacy = parseDashboardLayout({
  views: [{ name: "Blog", query: "range=month&filter=blog&evil=1" }],
  widgets: [{ hidden: true, id: "systems" }, { id: "bogus" }],
});
assert.equal(legacy.views[0].query, "range=month&filter=blog");
assert.equal(legacy.widgets[0].id, "systems");
assert.equal(legacy.widgets[0].hidden, true);
assert.equal(legacy.widgets.length, DEFAULT_DASHBOARD_LAYOUT.widgets.length);
assert.deepEqual(legacy.overrides, { fewerNumbers: null, locale: null });
assert.equal(widgetLimit(legacy, "pages"), 6);
assert.equal(widgetStyle(legacy, "traffic"), "line");

// GoatCounter import: order, options, removed widgets hidden, default view.
const imported = layoutFromGoatCounter({
  views: [{ filter: "blog", group: 1, name: "default", period: "month" }],
  widgets: [
    { n: "totalpages", s: { style: "bar" } },
    { n: "pages", s: { limit_pages: 25, style: "text" } },
    { n: "toprefs", s: { limit: 10 } },
  ],
});
assert.ok(imported);
assert.deepEqual(
  imported.widgets.slice(0, 4).map((widget) => widget.id),
  ["kpis", "traffic", "pages", "referrers"]
);
assert.equal(widgetStyle(imported, "traffic"), "bar");
assert.equal(widgetLimit(imported, "pages"), 25);
assert.equal(widgetStyle(imported, "pages"), "text");
assert.equal(widgetLimit(imported, "referrers"), 10);
assert.equal(
  imported.widgets.find((widget) => widget.id === "browsers")?.hidden,
  true
);
assert.equal(imported.defaultView, IMPORTED_VIEW_NAME);
assert.equal(imported.views[0].query, "range=month&filter=blog&group=day");

// GoatCounter's untouched defaults import nothing.
assert.equal(
  layoutFromGoatCounter({
    views: [{ group: 0, name: "default", period: "week" }],
  }),
  null
);
assert.equal(layoutFromGoatCounter(null), null);

console.log("dashboard-layout: all checks passed");
