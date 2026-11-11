import { previousRange } from "$lib/period.js";
import { siteVhost } from "$lib/server/goatcounter/site-context.js";
import * as stats from "$lib/server/goatcounter/stats.js";
import { getDateRangeFromUrl, toDateRange } from "$lib/server/helpers.js";
import { orNull } from "$lib/server/report-summary.js";

export async function load({ locals, parent, url }) {
  const { preferences, sites } = await parent();
  const { end, endWall, range, start, startWall } = getDateRangeFromUrl(
    url,
    preferences.timezone
  );
  const prevWall = previousRange(startWall, endWall);
  const previous = toDateRange(
    "previous",
    prevWall.start,
    prevWall.end,
    preferences.timezone
  );

  // ponytail: GoatCounter picks the site by Host, so every site costs two
  // totals calls (current and previous period): 2 × sites requests through
  // the shared pacer, about 5 s for 10 sites at the default 4 calls a second.
  // Rows stream as each site answers. Past a few dozen sites this page needs
  // a site cap or pagination.
  // Current periods queue first so every row's count arrives before any
  // comparison.
  const current = sites.map((site) =>
    stats.streamReport(
      stats.getTotal(start, end, undefined, { vhost: siteVhost(site) }),
      locals.locale,
      "sites.loadFailed"
    )
  );
  const prior = sites.map((site) =>
    orNull(
      stats.getTotal(previous.start, previous.end, undefined, {
        vhost: siteVhost(site),
      })
    )
  );

  return {
    range,
    rows: sites.map((site, index) => ({
      current: current[index],
      id: site.id,
      name: site.cname || site.code,
      previous: prior[index],
    })),
  };
}
