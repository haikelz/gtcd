import type { GoatCounterRequestOptions } from "$lib/server/goatcounter/client.js";
import * as stats from "$lib/server/goatcounter/stats.js";
import type {
  CountTotalResponse,
  HitsResponse,
  StatsResponse,
} from "$lib/server/goatcounter/types.js";

/** Resolve to null instead of rejecting, so one failed request never breaks a page or report. */
export function orNull<T>(request: Promise<T> | null): Promise<T | null> {
  return request ? request.catch(() => null) : Promise.resolve(null);
}

export type ReportSummaryRequests = {
  readonly hits: Promise<HitsResponse | null>;
  readonly locations: Promise<StatsResponse | null>;
  readonly referrers: Promise<StatsResponse | null>;
  readonly total: Promise<CountTotalResponse | null>;
};

/**
 * Returns unawaited promises so callers can start other requests alongside.
 */
export function loadReportSummary(
  range: { readonly end: string; readonly start: string },
  options: GoatCounterRequestOptions,
  limit = 10
): ReportSummaryRequests {
  const { end, start } = range;

  return {
    hits: orNull(
      stats.getHits(start, end, limit, undefined, undefined, undefined, options)
    ),
    locations: orNull(
      stats.getStats(
        "locations",
        start,
        end,
        limit,
        undefined,
        undefined,
        options
      )
    ),
    referrers: orNull(
      stats.getStats(
        "toprefs",
        start,
        end,
        limit,
        undefined,
        undefined,
        options
      )
    ),
    total: orNull(stats.getTotal(start, end, undefined, options)),
  };
}
