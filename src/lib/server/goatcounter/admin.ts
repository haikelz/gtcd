import { clearClientCache, gcFetch, gcFetchRaw } from "./client.js";
import type { ExportJob, Site, SiteSettings, SitesResponse } from "./types.js";

export async function getSites(): Promise<readonly Site[]> {
  const response = await gcFetch<SitesResponse>("/api/v0/sites");
  return response.sites;
}

export async function getSite(siteId: number): Promise<Site> {
  return gcFetch<Site>(`/api/v0/sites/${siteId}`);
}

export async function updateSite(
  siteId: number,
  input: { readonly linkDomain: string; readonly settings: SiteSettings }
): Promise<Site> {
  const site = await gcFetch<Site>(`/api/v0/sites/${siteId}`, {
    method: "PATCH",
    body: JSON.stringify({
      link_domain: input.linkDomain,
      settings: input.settings,
    }),
  });

  clearClientCache();
  return site;
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
