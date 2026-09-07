import * as stats from "$lib/server/goatcounter/stats.js";
import type { StatsPage } from "$lib/server/goatcounter/types.js";
import { getDateRangeFromUrl } from "$lib/server/helpers.js";

export async function load({ url }) {
  const { range, start, end } = getDateRangeFromUrl(url);

  try {
    const result = await stats.getStats(
      "locations" as StatsPage,
      start,
      end,
      50
    );
    return { range, stats: result };
  } catch (e: unknown) {
    return {
      range,
      error: e instanceof Error ? e.message : "Failed",
      stats: null,
    };
  }
}
