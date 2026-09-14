import * as stats from "$lib/server/goatcounter/stats.js";
import type { StatsPage } from "$lib/server/goatcounter/types.js";
import { getDateRangeFromUrl, getOffsetFromUrl } from "$lib/server/helpers.js";

export async function load({ url, parent }) {
  const { range, start, end } = getDateRangeFromUrl(url);
  const offset = getOffsetFromUrl(url);
  const { vhost } = await parent();

  try {
    const result = await stats.getStats(
      "campaigns" as StatsPage,
      start,
      end,
      50,
      offset,
      { vhost }
    );
    return { range, offset, stats: result };
  } catch (e: unknown) {
    return {
      range,
      offset,
      error: e instanceof Error ? e.message : "Failed",
      stats: null,
    };
  }
}
