import { previousRange } from "$lib/period.js";
import {
  getFilterFromUrl,
  resolveFilter,
} from "$lib/server/goatcounter/filter.js";
import * as stats from "$lib/server/goatcounter/stats.js";
import { getDateRangeFromUrl, toDateRange } from "$lib/server/helpers.js";

function parseExcludedPathIds(value: string | null): string {
  if (!value) return "";

  const ids = value.split(",");
  if (ids.some((id) => !/^\d+$/.test(id) || Number(id) < 1)) {
    throw new Error("Choose a valid page list.");
  }

  return ids.join(",");
}

export async function load({ url, parent }) {
  const { preferences, vhost } = await parent();
  const { end, endWall, range, start, startWall } = getDateRangeFromUrl(
    url,
    preferences.timezone
  );
  const excludedPathIds = parseExcludedPathIds(url.searchParams.get("exclude"));

  try {
    const includePaths = await resolveFilter(getFilterFromUrl(url), { vhost });
    const hits = await stats.getHits(
      start,
      end,
      100,
      excludedPathIds,
      undefined,
      includePaths,
      { vhost }
    );
    const nextExcludedPathIds = [
      excludedPathIds,
      ...hits.hits.map((hit) => String(hit.path_id)),
    ]
      .filter(Boolean)
      .join(",");
    const previousExcludedPathIds = excludedPathIds
      .split(",")
      .filter(Boolean)
      .slice(0, -100)
      .join(",");

    // Change against the previous period for the displayed rows.
    let diffs: Record<number, number | null> | null = null;
    if (hits.hits.length > 0) {
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
          { vhost }
        );
        const prevCounts = new Map(
          prevHits.hits.map((hit) => [hit.path_id, hit.count])
        );
        diffs = {};
        for (const hit of hits.hits) {
          const prevCount = prevCounts.get(hit.path_id) ?? 0;
          diffs[hit.path_id] =
            prevCount === 0
              ? null
              : ((hit.count - prevCount) / prevCount) * 100;
        }
      } catch {
        diffs = null;
      }
    }

    return {
      range,
      hits,
      excludedPathIds,
      nextExcludedPathIds,
      previousExcludedPathIds,
      diffs,
    };
  } catch (e: unknown) {
    return {
      range,
      error: e instanceof Error ? e.message : "Failed",
      hits: null,
      excludedPathIds,
      nextExcludedPathIds: "",
      previousExcludedPathIds: "",
      diffs: null,
    };
  }
}
