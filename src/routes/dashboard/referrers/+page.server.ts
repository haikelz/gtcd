import {
  getFilterFromUrl,
  resolveFilter,
} from "$lib/server/goatcounter/filter.js";
import * as stats from "$lib/server/goatcounter/stats.js";
import { getDateRangeFromUrl, getOffsetFromUrl } from "$lib/server/helpers.js";

export async function load({ url, parent }) {
  const { preferences, vhost } = await parent();
  const { range, start, end } = getDateRangeFromUrl(url, preferences.timezone);
  const offset = getOffsetFromUrl(url);

  try {
    const includePaths = await resolveFilter(getFilterFromUrl(url), { vhost });
    const refs = await stats.getStats(
      "toprefs",
      start,
      end,
      100,
      offset,
      includePaths,
      { vhost }
    );
    return { range, offset, refs };
  } catch (error: unknown) {
    return {
      range,
      offset,
      error:
        error instanceof Error ? error.message : "Failed to load referrers.",
      refs: null,
    };
  }
}
