import { error } from "@sveltejs/kit";
import { type MessageKey, translate } from "$lib/i18n";
import {
  getFilterFromUrl,
  resolveFilter,
} from "$lib/server/goatcounter/filter.js";
import { getDateRangeFromUrl, getOffsetFromUrl } from "$lib/server/helpers.js";
import {
  getStatsDetail,
  isStatsDetailPage,
  streamReport,
} from "$lib/server/goatcounter/stats.js";

const REPORTS = {
  browsers: {
    labelKey: "reports.detailBrowsers",
    parentKey: "reports.parentBrowsers",
    parentHref: "/dashboard/browsers",
    route: "browsers",
  },
  systems: {
    labelKey: "reports.detailSystems",
    parentKey: "reports.parentSystems",
    parentHref: "/dashboard/systems",
    route: "systems",
  },
  locations: {
    labelKey: "reports.detailLocations",
    parentKey: "reports.parentLocations",
    parentHref: "/dashboard/locations",
    route: "locations",
  },
  sizes: {
    labelKey: "reports.detailSizes",
    parentKey: "reports.parentDevices",
    parentHref: "/dashboard/devices",
    route: "sizes",
  },
  campaigns: {
    labelKey: "reports.detailCampaigns",
    parentKey: "reports.parentCampaigns",
    parentHref: "/dashboard/campaigns",
    route: "campaigns",
  },
  toprefs: {
    labelKey: "reports.detailToprefs",
    parentKey: "reports.parentReferrers",
    parentHref: "/dashboard/referrers",
    route: "toprefs",
  },
} as const satisfies Record<
  string,
  {
    labelKey: MessageKey;
    parentHref: string;
    parentKey: MessageKey;
    route: string;
  }
>;

export async function load({ locals, params, url, parent }) {
  if (!isStatsDetailPage(params.page)) {
    throw error(404, translate(locals.locale, "reports.detailNotFound"));
  }

  const report = REPORTS[params.page];
  const { preferences, vhost } = await parent();
  const { range, start, end } = getDateRangeFromUrl(url, preferences.timezone);
  const offset = getOffsetFromUrl(url);

  // Streamed: the page renders its skeleton while GoatCounter answers.
  const page = params.page;
  const detail = streamReport(
    resolveFilter(getFilterFromUrl(url), { vhost }).then((includePaths) =>
      getStatsDetail(page, params.id, start, end, 50, offset, includePaths, {
        vhost,
      })
    ),
    locals.locale,
    "reports.detailLoadFailed"
  );

  return { detail, detailId: params.id, offset, range, report };
}
