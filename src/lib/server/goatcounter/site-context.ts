import { getVhost } from "./client.js";
import { getSites } from "./admin.js";
import { getMe } from "./stats.js";
import type { Site } from "./types.js";

export interface DashboardSite {
  readonly id: number;
  readonly cname?: string;
  readonly code: string;
}

export interface DashboardSiteContext {
  readonly site: DashboardSite;
  readonly sites: readonly DashboardSite[];
  readonly vhost?: string;
}

function toDashboardSite(site: Site): DashboardSite {
  return {
    id: site.id,
    cname: site.cname,
    code: site.code,
  };
}

function parseSiteId(url: URL): number | undefined {
  const value = url.searchParams.get("site");
  if (!value || !/^\d+$/.test(value)) return undefined;

  const siteId = Number(value);
  return Number.isSafeInteger(siteId) && siteId > 0 ? siteId : undefined;
}

export async function getDashboardSiteContext(
  url: URL
): Promise<DashboardSiteContext> {
  const [currentUser, accessibleSites] = await Promise.all([
    getMe(),
    getSites(),
  ]);
  const requestedSiteId = parseSiteId(url);
  const selectedSiteId = requestedSiteId ?? currentUser.user.site;
  const selectedSite = accessibleSites.find(
    (site) => site.id === selectedSiteId
  );

  if (!selectedSite) {
    throw new Error("The selected GoatCounter site is not accessible.");
  }

  return {
    site: toDashboardSite(selectedSite),
    sites: accessibleSites.map(toDashboardSite),
    vhost: (selectedSite.cname ?? getVhost()) || undefined,
  };
}

export function siteSearchParams(site: DashboardSite): string {
  return `site=${site.id}`;
}
