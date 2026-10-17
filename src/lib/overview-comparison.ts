import type {
  CountTotalResponse,
  StatsResponse,
} from "./server/goatcounter/types.js";

/** GoatCounter's total includes events, so subtract them for pageviews. */
export function compareTotals(
  current: CountTotalResponse | null,
  previous: CountTotalResponse | null
) {
  return {
    pageviews: compareCount(
      current ? current.total - current.total_events : null,
      previous ? previous.total - previous.total_events : null
    ),
    events: compareCount(
      current?.total_events ?? null,
      previous?.total_events ?? null
    ),
  };
}

/** Missing data is not a zero baseline. Percent is undefined for new activity. */
export function compareCount(current: number | null, previous: number | null) {
  if (current === null || previous === null) return null;
  if (
    !Number.isFinite(current) ||
    !Number.isFinite(previous) ||
    current < 0 ||
    previous < 0
  )
    return null;

  return {
    current,
    previous,
    absolute: current - previous,
    percent: previous === 0 ? null : ((current - previous) / previous) * 100,
  };
}

/** Compare the same current leader, not two different category winners.
 * Incomplete distributions cannot establish a denominator or an absent ID.
 */
export function compareLeader(
  current: StatsResponse | null,
  previous: StatsResponse | null
) {
  if (!current || !previous || current.more || previous.more) return null;
  const leader = current.stats[0];
  const currentTotal = current.stats.reduce((sum, row) => sum + row.count, 0);
  const previousTotal = previous.stats.reduce((sum, row) => sum + row.count, 0);
  if (!leader || currentTotal <= 0 || previousTotal <= 0) return null;

  const share = (leader.count / currentTotal) * 100;
  const previousShare =
    ((previous.stats.find((row) => row.id === leader.id)?.count ?? 0) /
      previousTotal) *
    100;
  return { name: leader.name, share, shift: share - previousShare };
}
