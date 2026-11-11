import { fail } from "@sveltejs/kit";
import {
  isWidgetVisible,
  type Locale,
  type WidgetId,
  widgetLimit,
} from "$lib/dashboard-layout.js";
import { translate } from "$lib/i18n/index.js";
import { previousRange, toDayString } from "$lib/period.js";
import {
  addAnnotation,
  type Annotation,
  deleteAnnotation,
  isAnnotationDate,
  isAnnotationId,
  listAnnotations,
  MAX_ANNOTATIONS,
  normalizeAnnotationText,
} from "$lib/server/annotations.js";
import { requireDashboardAdmin } from "$lib/server/auth/admin.js";
import {
  getFilterFromUrl,
  resolveFilter,
} from "$lib/server/goatcounter/filter.js";
import { getDashboardSiteContext } from "$lib/server/goatcounter/site-context.js";
import * as stats from "$lib/server/goatcounter/stats.js";
import type { HitsResponse } from "$lib/server/goatcounter/types.js";
import { getDateRangeFromUrl, toDateRange } from "$lib/server/helpers.js";
import { orNull } from "$lib/server/report-summary.js";
import type { Actions, PageServerLoad } from "./$types";

type PeriodAnnotations = {
  readonly error: string | null;
  readonly notes: readonly Annotation[];
};

/**
 * Chart notes for the period. Redis is the only source: when it cannot be
 * read, the list shows an error instead of an empty or stale list.
 */
async function periodAnnotations(
  siteId: number,
  start: Date,
  end: Date,
  locale: Locale
): Promise<PeriodAnnotations> {
  try {
    return {
      error: null,
      notes: await listAnnotations(
        siteId,
        toDayString(start),
        toDayString(end)
      ),
    };
  } catch (cause: unknown) {
    console.error(
      "Annotations unavailable:",
      cause instanceof Error ? cause.message : cause
    );
    return {
      error: translate(locale, "insights.notesUnavailable"),
      notes: [],
    };
  }
}

/**
 * The overview streams every GoatCounter request: the page renders as soon as
 * the filter resolves, and each widget fills in when its own data arrives.
 * Upstream pacing (GOATCOUNTER_API_RATE) would otherwise hold the whole page
 * for seconds.
 * A failed widget rejects with a translated message so it can show an error
 * with Retry instead of looking empty.
 */
export const load: PageServerLoad = async ({ url, parent }) => {
  const { dashboardLayout, preferences, site, vhost } = await parent();
  const { end, endWall, range, start, startWall } = getDateRangeFromUrl(
    url,
    preferences.timezone
  );
  // Notes sit under the traffic chart; read them while the filter resolves.
  const annotations: Promise<PeriodAnnotations> = isWidgetVisible(
    dashboardLayout,
    "traffic"
  )
    ? periodAnnotations(site.id, startWall, endWall, preferences.locale)
    : Promise.resolve({ error: null, notes: [] });
  const requestOptions = { vhost };
  const prevWall = previousRange(startWall, endWall);
  const previous = toDateRange(
    "previous",
    prevWall.start,
    prevWall.end,
    preferences.timezone
  );

  let includePaths: number[] | undefined;
  try {
    includePaths = await resolveFilter(getFilterFromUrl(url), requestOptions);
  } catch (cause: unknown) {
    const none = Promise.resolve(null);

    // Without a resolved filter no widget has data; the page shows only this.
    return {
      annotations: { error: null, notes: [] } satisfies PeriodAnnotations,
      browsers: none,
      campaigns: none,
      comparison: { total: none, browsers: none, locations: none },
      diffs: none,
      filterError: stats.reportLoadError(
        cause,
        preferences.locale,
        "overview.filterFailed"
      ),
      hits: none,
      languages: none,
      locations: none,
      range,
      referrers: none,
      sizes: none,
      systems: none,
      total: none,
    };
  }

  // Skip upstream requests no visible widget needs. KPI tiles reuse totals,
  // pages, browsers and locations.
  function needs(...ids: WidgetId[]): boolean {
    return ids.some((id) => isWidgetVisible(dashboardLayout, id));
  }

  function topStats(page: Parameters<typeof stats.getStats>[0], limit = 15) {
    return stats.getStats(
      page,
      start,
      end,
      limit,
      undefined,
      includePaths,
      requestOptions
    );
  }

  function limitFor(id: WidgetId): number {
    return widgetLimit(dashboardLayout, id);
  }

  const requests = {
    browsers: needs("kpis", "browsers") ? topStats("browsers", 100) : null,
    campaigns: needs("campaigns")
      ? topStats("campaigns", limitFor("campaigns"))
      : null,
    // The KPI tile counts tracked pages, so fetch at least 20.
    hits: needs("kpis", "pages")
      ? stats.getHits(
          start,
          end,
          Math.max(limitFor("pages"), 20),
          undefined,
          undefined,
          includePaths,
          requestOptions
        )
      : null,
    languages: needs("languages")
      ? topStats("languages", limitFor("languages"))
      : null,
    locations: needs("kpis", "locations") ? topStats("locations", 100) : null,
    referrers: needs("referrers")
      ? topStats("toprefs", limitFor("referrers"))
      : null,
    sizes: needs("sizes") ? topStats("sizes") : null,
    systems: needs("systems") ? topStats("systems", limitFor("systems")) : null,
    // Busiest hours reuse the totals' hourly buckets.
    total: needs("kpis", "traffic", "hours")
      ? stats.getTotal(start, end, includePaths, requestOptions)
      : null,
  };
  function widget<T>(request: Promise<T> | null): Promise<T | null> {
    return request
      ? stats.streamReport(request, preferences.locale, "overview.loadFailed")
      : Promise.resolve(null);
  }

  // Change against the previous period, per displayed page — like
  // GoatCounter's dashboard. A nice-to-have: never fail the page for it.
  async function previousPeriodDiffs(
    hits: HitsResponse | null
  ): Promise<Record<number, number | null> | null> {
    if (!hits || hits.hits.length === 0) return null;

    const prevHits = await stats.getHits(
      previous.start,
      previous.end,
      100,
      undefined,
      undefined,
      hits.hits.map((hit) => hit.path_id),
      requestOptions
    );
    const prevCounts = new Map(
      prevHits.hits.map((hit) => [hit.path_id, hit.count])
    );

    const diffs: Record<number, number | null> = {};
    for (const hit of hits.hits) {
      const prevCount = prevCounts.get(hit.path_id) ?? 0;
      diffs[hit.path_id] =
        prevCount === 0 ? null : ((hit.count - prevCount) / prevCount) * 100;
    }
    return diffs;
  }

  const hits = widget(requests.hits);

  // Queue comparison work after current widgets. Stats calls retain the shared
  // cache, site isolation and outbound pacing; failures stay comparison-local.
  const comparison = {
    total: orNull(
      needs("kpis", "traffic")
        ? stats.getTotal(
            previous.start,
            previous.end,
            includePaths,
            requestOptions
          )
        : null
    ),
    browsers: orNull(
      needs("kpis", "browsers")
        ? stats.getStats(
            "browsers",
            previous.start,
            previous.end,
            100,
            undefined,
            includePaths,
            requestOptions
          )
        : null
    ),
    locations: orNull(
      needs("kpis", "locations")
        ? stats.getStats(
            "locations",
            previous.start,
            previous.end,
            100,
            undefined,
            includePaths,
            requestOptions
          )
        : null
    ),
  };

  return {
    annotations: await annotations,
    browsers: widget(requests.browsers),
    campaigns: widget(requests.campaigns),
    comparison,
    diffs: hits.then(previousPeriodDiffs).catch(() => null),
    filterError: null,
    hits,
    languages: widget(requests.languages),
    locations: widget(requests.locations),
    range,
    referrers: widget(requests.referrers),
    sizes: widget(requests.sizes),
    systems: widget(requests.systems),
    total: widget(requests.total),
  };
};

/**
 * Admins add and delete chart notes. SvelteKit's origin check rejects
 * cross-site POSTs here, as for every other form action.
 */
export const actions: Actions = {
  addNote: async ({ locals, request }) => {
    const admin = requireDashboardAdmin(locals.user);
    const form = await request.formData();
    const date = form.get("date");
    const text = normalizeAnnotationText(form.get("text"));

    if (!isAnnotationDate(date) || !text) {
      return fail(400, {
        action: "addNote",
        message: translate(locals.locale, "insights.noteInvalid"),
      });
    }

    const { site } = await getDashboardSiteContext(new URL(request.url));
    let added: Annotation | null;
    try {
      added = await addAnnotation(site.id, {
        createdBy: admin.email,
        date,
        text,
      });
    } catch (cause: unknown) {
      console.error(
        "Annotation not saved:",
        cause instanceof Error ? cause.message : cause
      );
      return fail(503, {
        action: "addNote",
        message: translate(locals.locale, "insights.noteSaveFailed"),
      });
    }

    if (!added) {
      return fail(400, {
        action: "addNote",
        message: translate(locals.locale, "insights.noteLimit", {
          max: MAX_ANNOTATIONS,
        }),
      });
    }

    return {
      action: "addNote",
      message: translate(locals.locale, "insights.noteAdded"),
    };
  },
  deleteNote: async ({ locals, request }) => {
    requireDashboardAdmin(locals.user);
    const form = await request.formData();
    const id = form.get("id");

    if (!isAnnotationId(id)) {
      return fail(400, {
        action: "deleteNote",
        message: translate(locals.locale, "insights.noteNotFound"),
      });
    }

    const { site } = await getDashboardSiteContext(new URL(request.url));
    try {
      await deleteAnnotation(site.id, id);
    } catch (cause: unknown) {
      console.error(
        "Annotation not deleted:",
        cause instanceof Error ? cause.message : cause
      );
      return fail(503, {
        action: "deleteNote",
        message: translate(locals.locale, "insights.noteSaveFailed"),
      });
    }

    return {
      action: "deleteNote",
      message: translate(locals.locale, "insights.noteDeleted"),
    };
  },
};
