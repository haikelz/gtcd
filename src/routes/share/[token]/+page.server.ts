import { error } from "@sveltejs/kit";
import { translate } from "$lib/i18n/index.js";
import { groupForRange } from "$lib/period.js";
import { toDisplayPreferences } from "$lib/preferences.js";
import { getSites } from "$lib/server/goatcounter/admin.js";
import { getVhost } from "$lib/server/goatcounter/client.js";
import {
  getMe,
  getTotal,
  getHits,
  getStats,
} from "$lib/server/goatcounter/stats.js";
import { getDateRangeFromUrl } from "$lib/server/helpers.js";
import { orNull } from "$lib/server/report-summary.js";
import { resolveShareGrant, SHARE_RANGES } from "$lib/server/share-store.js";

const PUBLIC_RANGES = ["week", "month", "quarter", "year"] as const;

type PublicRange = (typeof PUBLIC_RANGES)[number];

function isPublicRange(value: string | null): value is PublicRange {
  return PUBLIC_RANGES.some((range) => range === value);
}

/**
 * Read-only overview behind a revocable share token. Data is fetched with
 * gtcd's server-side API token; viewers get no session and no report links.
 */
export async function load({ locals, params, setHeaders, url }) {
  const grant = await resolveShareGrant(params.token);
  if (grant === null) {
    throw error(404, translate(locals.locale, "share.notFound"));
  }

  const { siteId, link } = grant;
  const [me, sites] = await Promise.all([getMe(), getSites()]);
  const site = sites.find((candidate) => candidate.id === siteId);
  if (!site) throw error(404, translate(locals.locale, "share.notFound"));

  setHeaders({ "X-Robots-Tag": "noindex, nofollow" });

  const preferences = toDisplayPreferences(me.user.settings);
  const requested = url.searchParams.get("range");
  const ranges = SHARE_RANGES.slice(0, SHARE_RANGES.indexOf(link.maxRange) + 1);
  if (
    requested !== null &&
    (!isPublicRange(requested) || !ranges.some((range) => range === requested))
  ) {
    throw error(400, translate(locals.locale, "share.invalidGrant"));
  }
  const range: PublicRange = isPublicRange(requested) ? requested : "week";
  const dates = getDateRangeFromUrl(
    new URL(`?range=${range}`, url),
    preferences.timezone
  );

  const options = { vhost: site.cname ?? getVhost() };
  const { start, end } = dates;
  return {
    ...(link.metrics.includes("total")
      ? { total: orNull(getTotal(start, end, undefined, options)) }
      : {}),
    ...(link.metrics.includes("hits")
      ? {
          hits: orNull(
            getHits(start, end, 10, undefined, undefined, undefined, options)
          ),
        }
      : {}),
    ...(link.metrics.includes("browsers")
      ? {
          browsers: orNull(
            getStats("browsers", start, end, 15, undefined, undefined, options)
          ),
        }
      : {}),
    ...(link.metrics.includes("referrers")
      ? {
          referrers: orNull(
            getStats("toprefs", start, end, 10, undefined, undefined, options)
          ),
        }
      : {}),
    ...(link.metrics.includes("locations")
      ? {
          locations: orNull(
            getStats("locations", start, end, 10, undefined, undefined, options)
          ),
        }
      : {}),
    metrics: link.metrics,
    group: groupForRange(dates.startWall, dates.endWall).group,
    linkDomain: site.link_domain?.trim() || undefined,
    preferences,
    range,
    ranges,
    siteName: site.cname || site.code,
  };
}
