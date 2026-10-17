import { translate } from "$lib/i18n";
import { previousRange } from "$lib/period.js";
import {
  getFilterFromUrl,
  resolveFilter,
} from "$lib/server/goatcounter/filter.js";
import * as stats from "$lib/server/goatcounter/stats.js";
import { getDateRangeFromUrl, toDateRange } from "$lib/server/helpers.js";
import {
  MAX_EXCLUDED_PATHS,
  pageCursorKey,
  pageCursorScope,
  readPageCursor,
  savePageCursor,
} from "$lib/server/page-cursors.js";

export async function load({ locals, url, parent }) {
  const { preferences, site, vhost } = await parent();
  const { end, endWall, range, start, startWall } = getDateRangeFromUrl(
    url,
    preferences.timezone
  );
  const token = url.searchParams.get("cursor") ?? "";
  const filter = getFilterFromUrl(url);
  const key = pageCursorKey(locals.user?.email ?? "", vhost ?? "default");
  const scope = pageCursorScope([
    site.id,
    start,
    end,
    preferences.timezone,
    filter,
  ]);
  const base = {
    range,
    hits: null,
    comparison: Promise.resolve(null),
    nextCursor: "",
    previousCursor: "",
    hasPrevious: false,
    paginationNotice: "",
    cursorError: false,
  };

  try {
    const cursor = token ? await readPageCursor(key, scope, token) : undefined;
    if ((token && !cursor) || url.searchParams.has("exclude")) {
      return {
        ...base,
        cursorError: true,
        error: translate(locals.locale, "reports.paginationExpired"),
      };
    }
    const excluded = cursor?.ids ?? [];
    const includePaths = await resolveFilter(filter, { vhost });
    const hits = await stats.getHits(
      start,
      end,
      100,
      excluded.join(","),
      undefined,
      includePaths,
      { vhost }
    );

    // The rejection handler is attached before returning the streamed promise.
    const comparison = (async () => {
      if (!hits.hits.length) return { status: "ready" as const, diffs: {} };
      const prevWall = previousRange(startWall, endWall);
      const prev = toDateRange(
        "previous",
        prevWall.start,
        prevWall.end,
        preferences.timezone
      );
      const previous = await stats.getHits(
        prev.start,
        prev.end,
        100,
        undefined,
        undefined,
        hits.hits.map((hit) => hit.path_id),
        { vhost }
      );
      const counts = new Map(
        previous.hits.map((hit) => [hit.path_id, hit.count])
      );
      const diffs: Record<number, number | null> = {};
      for (const hit of hits.hits) {
        const count = counts.get(hit.path_id) ?? 0;
        diffs[hit.path_id] =
          count === 0 ? null : ((hit.count - count) / count) * 100;
      }
      return { status: "ready" as const, diffs };
    })().catch(() => ({ status: "error" as const }));

    let nextCursor = "";
    let paginationNotice = "";
    if (hits.more) {
      const nextIds = [
        ...new Set([...excluded, ...hits.hits.map((hit) => hit.path_id)]),
      ];
      if (
        !hits.hits.length ||
        nextIds.length === excluded.length ||
        nextIds.length > MAX_EXCLUDED_PATHS
      ) {
        paginationNotice = translate(locals.locale, "reports.paginationLimit");
      } else {
        try {
          nextCursor = await savePageCursor(key, scope, nextIds, token);
        } catch {
          paginationNotice = translate(
            locals.locale,
            "reports.paginationUnavailable"
          );
        }
      }
    }
    return {
      range,
      hits,
      comparison,
      nextCursor,
      previousCursor: cursor?.previous ?? "",
      hasPrevious: Boolean(cursor),
      paginationNotice,
      cursorError: false,
    };
  } catch (e: unknown) {
    return {
      ...base,
      cursorError: Boolean(token),
      error:
        e instanceof Error
          ? e.message
          : translate(locals.locale, "reports.loadFailed"),
    };
  }
}
