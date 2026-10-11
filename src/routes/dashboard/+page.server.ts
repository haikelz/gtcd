import { isWidgetVisible, type WidgetId } from "$lib/dashboard-layout.js";
import { previousRange } from "$lib/period.js";
import {
  getFilterFromUrl,
  resolveFilter,
} from "$lib/server/goatcounter/filter.js";
import * as stats from "$lib/server/goatcounter/stats.js";
import type { HitsResponse } from "$lib/server/goatcounter/types.js";
import { getDateRangeFromUrl, toDateRange } from "$lib/server/helpers.js";
import type { PageServerLoad } from "./$types";

/** Resolve to null instead of rejecting, so one failed widget never breaks the stream. */
function orNull<T>(request: Promise<T> | null): Promise<T | null> {
  return request ? request.catch(() => null) : Promise.resolve(null);
}

function errorMessage(reason: unknown): string {
  return reason instanceof Error
    ? reason.message
    : "Failed to load dashboard data.";
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

  let includePaths: number[] | undefined;
  try {
    includePaths = await resolveFilter(getFilterFromUrl(url), requestOptions);
  } catch (e: unknown) {
    const none = Promise.resolve(null);

    return {
      browsers: none,
      diffs: none,
      error: Promise.resolve(
        e instanceof Error ? e.message : "Failed to apply the filter."
      ),
      hits: none,
      languages: none,
      locations: none,
      range,
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

  function topStats(page: Parameters<typeof stats.getStats>[0]) {
    return stats.getStats(
      page,
      start,
      end,
      15,
      undefined,
      includePaths,
      requestOptions
    );
  }

  const requests = {
    browsers: needs("kpis", "browsers") ? topStats("browsers") : null,
    hits: needs("kpis", "pages")
      ? stats.getHits(
          start,
          end,
          20,
          undefined,
          undefined,
          includePaths,
          requestOptions
        )
      : null,
    languages: needs("languages") ? topStats("languages") : null,
    locations: needs("kpis", "locations") ? topStats("locations") : null,
    sizes: needs("sizes") ? topStats("sizes") : null,
    systems: needs("systems") ? topStats("systems") : null,
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

    const prevWall = previousRange(startWall, endWall);
    const prev = toDateRange(
      "previous",
      prevWall.start,
      prevWall.end,
      preferences.timezone
    );
    const prevHits = await stats.getHits(
      prev.start,
      prev.end,
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

  return {
    browsers: orNull(requests.browsers),
    diffs: hits.then(previousPeriodDiffs).catch(() => null),
    // Only a load-wide failure gets the page-level alert; a single failed
    // widget falls back to its empty state.
    error: Promise.allSettled(started).then((results) => {
      const failures = results.filter(
        (result): result is PromiseRejectedResult =>
          result.status === "rejected"
      );
      return started.length > 0 && failures.length === started.length
        ? errorMessage(failures[0].reason)
        : null;
    }),
    hits,
    languages: orNull(requests.languages),
    locations: orNull(requests.locations),
    range,
    sizes: orNull(requests.sizes),
    systems: orNull(requests.systems),
    total: orNull(requests.total),
  };
};
