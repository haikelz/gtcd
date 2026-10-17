import {
  isWidgetVisible,
  type Locale,
  type WidgetId,
  widgetLimit,
} from "$lib/dashboard-layout.js";
import { translate } from "$lib/i18n";
import { previousRange } from "$lib/period.js";
import {
  getFilterFromUrl,
  resolveFilter,
} from "$lib/server/goatcounter/filter.js";
import * as stats from "$lib/server/goatcounter/stats.js";
import type { HitsResponse } from "$lib/server/goatcounter/types.js";
import { getDateRangeFromUrl, toDateRange } from "$lib/server/helpers.js";
import { orNull } from "$lib/server/report-summary.js";
import type { PageServerLoad } from "./$types";

function errorMessage(reason: unknown, locale: Locale): string {
  return reason instanceof Error
    ? reason.message
    : translate(locale, "overview.loadFailed");
}

/**
 * The overview streams every GoatCounter request: the page renders as soon as
 * the filter resolves, and each widget fills in when its own data arrives.
 * Upstream pacing (4 req/s) would otherwise hold the whole page for seconds.
 */
export const load: PageServerLoad = async ({ url, parent }) => {
  const { dashboardLayout, preferences, vhost } = await parent();
  const { end, endWall, range, start, startWall } = getDateRangeFromUrl(
    url,
    preferences.timezone
  );
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
  } catch (e: unknown) {
    const none = Promise.resolve(null);

    return {
      browsers: none,
      campaigns: none,
      comparison: { total: none, browsers: none, locations: none },
      diffs: none,
      error: Promise.resolve(
        e instanceof Error
          ? e.message
          : translate(preferences.locale, "overview.filterFailed")
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
    total: needs("kpis", "traffic")
      ? stats.getTotal(start, end, includePaths, requestOptions)
      : null,
  };
  const started = Object.values(requests).filter(
    (request): request is NonNullable<typeof request> => request !== null
  );

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

  const hits = orNull(requests.hits);

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
    browsers: orNull(requests.browsers),
    campaigns: orNull(requests.campaigns),
    comparison,
    diffs: hits.then(previousPeriodDiffs).catch(() => null),
    // Only a load-wide failure gets the page-level alert; a single failed
    // widget falls back to its empty state.
    error: Promise.allSettled(started).then((results) => {
      const failures = results.filter(
        (result): result is PromiseRejectedResult =>
          result.status === "rejected"
      );
      return started.length > 0 && failures.length === started.length
        ? errorMessage(failures[0].reason, preferences.locale)
        : null;
    }),
    hits,
    languages: orNull(requests.languages),
    locations: orNull(requests.locations),
    range,
    referrers: orNull(requests.referrers),
    sizes: orNull(requests.sizes),
    systems: orNull(requests.systems),
    total: orNull(requests.total),
  };
};
