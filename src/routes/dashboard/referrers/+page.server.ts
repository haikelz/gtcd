import * as stats from "$lib/server/goatcounter/stats.js";
import { getDateRangeFromUrl, getOffsetFromUrl } from "$lib/server/helpers.js";

export async function load({ url }) {
  const { range, start, end } = getDateRangeFromUrl(url);
  const offset = getOffsetFromUrl(url);

  try {
    const refs = await stats.getStats("toprefs", start, end, 100, offset);
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
