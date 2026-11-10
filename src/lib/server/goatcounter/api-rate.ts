// No imports: api-rate.check.ts runs this file directly with
// node --experimental-strip-types.

/** GoatCounter's default API limit, `-ratelimit api:4/1`. */
const DEFAULT_RATE = 4;

/**
 * Milliseconds between GoatCounter API calls for GOATCOUNTER_API_RATE: the
 * requests a second the instance's `-ratelimit api:N/1` allows. Calls stay
 * 12% under it, so 4/s spaces them 280 ms apart and 20/s 56 ms. A missing or
 * invalid value keeps GoatCounter's default, the only limit goatcounter.com
 * allows.
 */
export function requestIntervalMs(rate: string | undefined): number {
  const perSecond = Number(rate?.trim() || DEFAULT_RATE);
  return Math.ceil(
    1120 /
      (Number.isFinite(perSecond) && perSecond > 0 ? perSecond : DEFAULT_RATE)
  );
}
