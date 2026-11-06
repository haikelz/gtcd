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

  // The cursor lives in Redis, so check it before streaming: an expired one
  // gets its own message and a way back to the first page.
  let cursor: Awaited<ReturnType<typeof readPageCursor>>;
  try {
    cursor = token ? await readPageCursor(key, scope, token) : undefined;
  } catch (cause: unknown) {
    return {
      range,
      cursorError: true,
      error: stats.reportLoadError(cause, locals.locale, "reports.loadFailed"),
    };
  }
  if ((token && !cursor) || url.searchParams.has("exclude")) {
    return {
      range,
      cursorError: true,
      error: translate(locals.locale, "reports.paginationExpired"),
    };
  }
  const excluded = cursor?.ids ?? [];

  const request = (async () => {
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
      hits,
      nextCursor,
      previousCursor: cursor?.previous ?? "",
      hasPrevious: Boolean(cursor),
      paginationNotice,
    };
  })();

  // Streamed: the page renders its skeleton while GoatCounter answers.
  const report = stats.streamReport(
    request,
    locals.locale,
    "reports.loadFailed"
  );

  // The rejection handler is attached before returning the streamed promise.
  const comparison = request
    .then(async ({ hits }) => {
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
    })
    .catch(() => ({ status: "error" as const }));

  // A failed later page offers the way back to the first one.
  return { range, report, comparison, cursorError: Boolean(token) };
}
