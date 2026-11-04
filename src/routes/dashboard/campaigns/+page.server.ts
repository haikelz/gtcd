import {
  getFilterFromUrl,
  resolveFilter,
} from "$lib/server/goatcounter/filter.js";
import * as stats from "$lib/server/goatcounter/stats.js";
import { getDateRangeFromUrl, getOffsetFromUrl } from "$lib/server/helpers.js";

export async function load({ locals, url, parent }) {
  const { preferences, vhost } = await parent();
  const { range, start, end } = getDateRangeFromUrl(url, preferences.timezone);
  const offset = getOffsetFromUrl(url);

  // Streamed: the page renders its skeleton while GoatCounter answers.
  const report = stats.streamReport(
    resolveFilter(getFilterFromUrl(url), { vhost }).then((includePaths) =>
      stats.getStats("campaigns", start, end, 50, offset, includePaths, {
        vhost,
      })
    ),
    locals.locale,
    "reports.loadFailed"
  );

  return { offset, range, report };
}
