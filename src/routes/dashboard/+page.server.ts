import { isWidgetVisible, type WidgetId } from "$lib/dashboard-layout.js";
import { previousRange } from "$lib/period.js";
import {
  getFilterFromUrl,
  resolveFilter,
} from "$lib/server/goatcounter/filter.js";
import * as stats from "$lib/server/goatcounter/stats.js";
import { getDateRangeFromUrl, toDateRange } from "$lib/server/helpers.js";
import type { PageServerLoad } from "./$types";

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
    return {
      range,
      error: e instanceof Error ? e.message : "Failed to apply the filter.",
      total: null,
      hits: null,
      browsers: null,
      systems: null,
      locations: null,
      languages: null,
      sizes: null,
      diffs: null,
    };
  }

  // Skip upstream requests no visible widget needs; GoatCounter allows only
  // four requests per second. KPI tiles reuse totals, pages, browsers and
  // locations.
  function needs(...ids: WidgetId[]): boolean {
    return ids.some((id) => isWidgetVisible(dashboardLayout, id));
  }

  function skipped(): Promise<null> {
    return Promise.resolve(null);
  }

  const [
    totalResult,
    hitsResult,
    browsersResult,
    systemsResult,
    locationsResult,
    languagesResult,
    sizesResult,
  ] = await Promise.allSettled([
    needs("kpis", "traffic")
      ? stats.getTotal(start, end, includePaths, requestOptions)
      : skipped(),
    needs("kpis", "pages")
      ? stats.getHits(
          start,
          end,
          20,
          undefined,
          undefined,
          includePaths,
          requestOptions
        )
      : skipped(),
    needs("kpis", "browsers")
      ? stats.getStats(
          "browsers",
          start,
          end,
          15,
          undefined,
          includePaths,
          requestOptions
        )
      : skipped(),
    needs("systems")
      ? stats.getStats(
          "systems",
          start,
          end,
          15,
          undefined,
          includePaths,
          requestOptions
        )
      : skipped(),
    needs("kpis", "locations")
      ? stats.getStats(
          "locations",
          start,
          end,
          15,
          undefined,
          includePaths,
          requestOptions
        )
      : skipped(),
    needs("languages")
      ? stats.getStats(
          "languages",
          start,
          end,
          15,
          undefined,
          includePaths,
          requestOptions
        )
      : skipped(),
    needs("sizes")
      ? stats.getStats(
          "sizes",
          start,
          end,
          15,
          undefined,
          includePaths,
          requestOptions
        )
      : skipped(),
  ]);

  const total = totalResult.status === "fulfilled" ? totalResult.value : null;
  const hits = hitsResult.status === "fulfilled" ? hitsResult.value : null;
  const browsers =
    browsersResult.status === "fulfilled" ? browsersResult.value : null;
  const systems =
    systemsResult.status === "fulfilled" ? systemsResult.value : null;
  const locations =
    locationsResult.status === "fulfilled" ? locationsResult.value : null;
  const languages =
    languagesResult.status === "fulfilled" ? languagesResult.value : null;
  const sizes = sizesResult.status === "fulfilled" ? sizesResult.value : null;

  // Change against the previous period, per displayed page — like
  // GoatCounter's dashboard. A nice-to-have: never fail the page for it.
  let diffs: Record<number, number | null> | null = null;
  if (hits && hits.hits.length > 0) {
    try {
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
      diffs = {};
      for (const hit of hits.hits) {
        const prevCount = prevCounts.get(hit.path_id) ?? 0;
        diffs[hit.path_id] =
          prevCount === 0 ? null : ((hit.count - prevCount) / prevCount) * 100;
      }
    } catch {
      diffs = null;
    }
  }

  const allFailed =
    !total &&
    !hits &&
    !browsers &&
    !systems &&
    !locations &&
    !languages &&
    !sizes;

  let generalError: string | null = null;
  if (allFailed) {
    const firstRejection = [
      totalResult,
      hitsResult,
      browsersResult,
      systemsResult,
      locationsResult,
      languagesResult,
      sizesResult,
    ].find((result) => result.status === "rejected") as
      PromiseRejectedResult | undefined;

    generalError =
      firstRejection?.reason instanceof Error
        ? firstRejection.reason.message
        : "Failed to load dashboard data.";
  }

  return {
    range,
    error: generalError,
    total,
    hits,
    browsers,
    systems,
    locations,
    languages,
    sizes,
    diffs,
  };
};
