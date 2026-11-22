import * as stats from "$lib/server/goatcounter/stats.js";
import { getDateRangeFromUrl, getOffsetFromUrl } from "$lib/server/helpers.js";

export async function load({ locals, params, url, parent }) {
  const { preferences, vhost } = await parent();
  const { range, start, end } = getDateRangeFromUrl(
    url,
    preferences.timezone,
    locals.locale
  );
  const offset = getOffsetFromUrl(url, locals.locale);
  const pathId = Number(params.id);

  // Streamed: referrers render into a skeleton. Hits only supply the path
  // for the title, read for this path alone and unfiltered; the title falls
  // back to the ID while they load, if they fail, or if the period has none.
  const refs = stats.streamReport(
    stats.getReferrals(pathId, start, end, 30, offset, { vhost }),
    locals.locale,
    "reports.loadFailed"
  );
  const hits = stats
    .getHits(start, end, 1, undefined, undefined, [pathId], { vhost })
    .catch(() => null);

  return { hits, offset, pathId, range, refs };
}
