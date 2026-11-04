import {
  getFilterFromUrl,
  resolveFilter,
} from "$lib/server/goatcounter/filter.js";
import * as stats from "$lib/server/goatcounter/stats.js";
import { getDateRangeFromUrl, getOffsetFromUrl } from "$lib/server/helpers.js";

export async function load({ locals, params, url, parent }) {
  const { preferences, vhost } = await parent();
  const { range, start, end } = getDateRangeFromUrl(url, preferences.timezone);
  const offset = getOffsetFromUrl(url);
  const pathId = Number(params.id);

  // Streamed: referrers render into a skeleton. Hits only supply the path
  // for the title, which falls back to the ID while they load or fail.
  const refs = stats.streamReport(
    stats.getReferrals(pathId, start, end, 30, offset, { vhost }),
    locals.locale,
    "reports.loadFailed"
  );
  const hits = resolveFilter(getFilterFromUrl(url), { vhost })
    .then((includePaths) =>
      stats.getHits(start, end, 100, undefined, undefined, includePaths, {
        vhost,
      })
    )
    .catch(() => null);

  return { hits, offset, pathId, range, refs };
}
