import { clearClientCache, gcFetch, gcFetchRaw } from "./client.js";
import type { ExportJob, Site, SiteSettings } from "./types.js";

type GoatCounterSite = Omit<Site, "settings"> & {
  readonly settings?: SiteSettings;
  readonly setttings?: SiteSettings;
};

function normalizeSite(site: GoatCounterSite): Site {
  const settings = site.settings ?? site.setttings;

  if (!settings) {
    throw new Error("GoatCounter returned a site without settings.");
  }

  return { ...site, settings };
}

export async function getSites(): Promise<readonly Site[]> {
  const response = await gcFetch<{
    readonly sites: readonly GoatCounterSite[];
  }>("/api/v0/sites");

  return response.sites.map(normalizeSite);
}

export async function getSite(siteId: number): Promise<Site> {
  const site = await gcFetch<GoatCounterSite>(`/api/v0/sites/${siteId}`);

  return normalizeSite(site);
}

export async function updateSite(
  siteId: number,
  input: { readonly linkDomain: string; readonly settings: SiteSettings }
): Promise<Site> {
  const site = await gcFetch<GoatCounterSite>(`/api/v0/sites/${siteId}`, {
    method: "PATCH",
    body: JSON.stringify({
      link_domain: input.linkDomain,
      settings: input.settings,
    }),
  });

  clearClientCache();
  return normalizeSite(site);
}

export async function createExport(format: "csv" | "json"): Promise<ExportJob> {
  return gcFetch<ExportJob>(
    "/api/v0/export",
    {
      method: "POST",
      body: JSON.stringify({ format }),
    },
    undefined,
    { bypassCache: true }
  );
}

export async function getExport(exportId: number): Promise<ExportJob> {
  return gcFetch<ExportJob>(`/api/v0/export/${exportId}`, {}, undefined, {
    bypassCache: true,
  });
}

export async function downloadExport(exportId: number): Promise<Response> {
  return gcFetchRaw(`/api/v0/export/${exportId}/download`);
}
