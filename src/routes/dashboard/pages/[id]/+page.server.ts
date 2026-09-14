import * as stats from "$lib/server/goatcounter/stats.js";
import { getDateRangeFromUrl, getOffsetFromUrl } from "$lib/server/helpers.js";

export async function load({ params, url, parent }) {
  const { range, start, end } = getDateRangeFromUrl(url);
  const offset = getOffsetFromUrl(url);
  const pathId = Number(params.id);
  const { vhost } = await parent();

  try {
    const [refs, hits] = await Promise.all([
      stats.getReferrals(pathId, start, end, 30, offset, { vhost }),
      stats.getHits(start, end, 100, undefined, undefined, { vhost }),
    ]);
    return { range, offset, refs, hits, pathId };
  } catch (e: unknown) {
    return {
      range,
      offset,
      error: e instanceof Error ? e.message : "Failed",
      refs: null,
      hits: null,
      pathId,
    };
  }
}
