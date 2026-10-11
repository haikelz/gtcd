import { translate } from "$lib/i18n";
import {
  getFilterFromUrl,
  resolveFilter,
} from "$lib/server/goatcounter/filter.js";
import * as stats from "$lib/server/goatcounter/stats.js";
import type { StatsPage } from "$lib/server/goatcounter/types.js";
import { getDateRangeFromUrl, getOffsetFromUrl } from "$lib/server/helpers.js";

export async function load({ locals, url, parent }) {
  const { preferences, vhost } = await parent();
  const { range, start, end } = getDateRangeFromUrl(url, preferences.timezone);
  const offset = getOffsetFromUrl(url);

  try {
    const includePaths = await resolveFilter(getFilterFromUrl(url), { vhost });
    const result = await stats.getStats(
      "languages" as StatsPage,
      start,
      end,
      50,
      offset,
      includePaths,
      { vhost }
    );
    return { range, offset, stats: result };
  } catch (e: unknown) {
    return {
      range,
      offset,
      error:
        e instanceof Error
          ? e.message
          : translate(locals.locale, "reports.loadFailed"),
      stats: null,
    };
  }
}
