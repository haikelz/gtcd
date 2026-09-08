import { clearClientCache, gcFetch, gcFetchRaw } from "./client.js";
import type { ExportJob, ExportRequest, Site, SiteSettings } from "./types.js";

type GoatCounterSettings = Omit<
  SiteSettings,
  "ignore_ips" | "collect_regions" | "allow_embed"
> & {
  readonly ignore_ips?: unknown;
  readonly collect_regions?: unknown;
  readonly allow_embed?: unknown;
};

type GoatCounterSettingsInput = Omit<
  SiteSettings,
  "ignore_ips" | "collect_regions" | "allow_embed"
> & {
  readonly ignore_ips: string;
  readonly collect_regions: string;
  readonly allow_embed: string;
};

type GoatCounterSite = Omit<Site, "settings"> & {
  readonly settings?: GoatCounterSettings;
  readonly setttings?: GoatCounterSettings;
};

function normalizeList(value: unknown): readonly string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value !== "string") return [];

  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function serializeList(values: readonly string[]): string {
  return values.join(",");
}

function toGoatCounterSettingsInput(
  settings: SiteSettings
): GoatCounterSettingsInput {
  return {
    ...settings,
    ignore_ips: serializeList(settings.ignore_ips),
    collect_regions: serializeList(settings.collect_regions),
    allow_embed: serializeList(settings.allow_embed),
  };
}

function normalizeSite(site: GoatCounterSite): Site {
  const settings = site.settings ?? site.setttings;

  if (!settings) {
    throw new Error("GoatCounter returned a site without settings.");
  }

  return {
    ...site,
    settings: {
      ...settings,
      ignore_ips: normalizeList(settings.ignore_ips),
      collect_regions: normalizeList(settings.collect_regions),
      allow_embed: normalizeList(settings.allow_embed),
    },
  };
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
      settings: toGoatCounterSettingsInput(input.settings),
    }),
  });

  clearClientCache();
  return normalizeSite(site);
}

export async function createSite(input: {
  readonly cname: string;
  readonly linkDomain: string;
}): Promise<Site> {
  const site = await gcFetch<GoatCounterSite>(
    "/api/v0/sites",
    {
      method: "PUT",
      body: JSON.stringify({
        cname: input.cname,
        link_domain: input.linkDomain,
      }),
    },
    undefined,
    { bypassCache: true }
  );

  clearClientCache();
  return normalizeSite(site);
}

export async function createExport(input: ExportRequest): Promise<ExportJob> {
  return gcFetch<ExportJob>(
    "/api/v0/export",
    {
      method: "POST",
      body: JSON.stringify({
        format: input.format,
        start_from_hit_id: input.startFromHitId,
        start_from_day: input.startFromDay,
      }),
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
