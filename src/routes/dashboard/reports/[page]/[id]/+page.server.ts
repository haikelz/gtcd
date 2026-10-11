import { error } from "@sveltejs/kit";
import {
  getFilterFromUrl,
  resolveFilter,
} from "$lib/server/goatcounter/filter.js";
import { getDateRangeFromUrl, getOffsetFromUrl } from "$lib/server/helpers.js";
import {
  getStatsDetail,
  isStatsDetailPage,
} from "$lib/server/goatcounter/stats.js";

const REPORTS = {
  browsers: {
    label: "Browser versions",
    parent: "Browsers",
    parentHref: "/dashboard/browsers",
    route: "browsers",
  },
  systems: {
    label: "System versions",
    parent: "Systems",
    parentHref: "/dashboard/systems",
    route: "systems",
  },
  locations: {
    label: "Regional detail",
    parent: "Locations",
    parentHref: "/dashboard/locations",
    route: "locations",
  },
  sizes: {
    label: "Screen-size detail",
    parent: "Devices",
    parentHref: "/dashboard/devices",
    route: "sizes",
  },
  campaigns: {
    label: "Campaign detail",
    parent: "Campaigns",
    parentHref: "/dashboard/campaigns",
    route: "campaigns",
  },
  toprefs: {
    label: "Referrer detail",
    parent: "Referrers",
    parentHref: "/dashboard/referrers",
    route: "toprefs",
  },
} as const;

export async function load({ params, url, parent }) {
  if (!isStatsDetailPage(params.page)) {
    throw error(404, "This report does not have a detail view.");
  }

  const report = REPORTS[params.page];
  const { preferences, vhost } = await parent();
  const { range, start, end } = getDateRangeFromUrl(url, preferences.timezone);
  const offset = getOffsetFromUrl(url);

  try {
    const includePaths = await resolveFilter(getFilterFromUrl(url), { vhost });
    const detail = await getStatsDetail(
      params.page,
      params.id,
      start,
      end,
      50,
      offset,
      includePaths,
      { vhost }
    );

    return { range, offset, report, detail, detailId: params.id };
  } catch (cause: unknown) {
    return {
      range,
      offset,
      report,
      detail: null,
      detailId: params.id,
      error: cause instanceof Error ? cause.message : "Failed to load detail.",
    };
  }
}
