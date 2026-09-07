import * as stats from "$lib/server/goatcounter/stats.js";
import { getDateRangeFromUrl } from "$lib/server/helpers.js";

export async function load({ url }) {
  const { range, start, end } = getDateRangeFromUrl(url);

  try {
    const refs = await stats.getStats("toprefs", start, end, 100);
    return { range, refs };
  } catch (error: unknown) {
    return {
      range,
      error:
        error instanceof Error ? error.message : "Failed to load referrers.",
      refs: null,
    };
  }
}
