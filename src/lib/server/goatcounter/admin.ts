import { clearClientCache, gcFetch, gcFetchRaw } from "./client.js";
import type { GoatCounterRequestOptions } from "./client.js";
import type { ExportJob, ExportRequest, Site, SiteSettings } from "./types.js";
import type { Locale } from "$lib/dashboard-layout";
import { translate } from "$lib/i18n";

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
  input: {
    readonly cname: string;
    readonly linkDomain: string;
    readonly settings: SiteSettings;
  }
): Promise<Site> {
  const site = await gcFetch<GoatCounterSite>(`/api/v0/sites/${siteId}`, {
    method: "PATCH",
    body: JSON.stringify({
      cname: input.cname,
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

export async function createExport(
  input: ExportRequest,
  options?: GoatCounterRequestOptions
): Promise<ExportJob> {
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
    { ...options, bypassCache: true }
  );
}

export async function getExport(
  exportId: number,
  options?: GoatCounterRequestOptions
): Promise<ExportJob> {
  return gcFetch<ExportJob>(`/api/v0/export/${exportId}`, {}, undefined, {
    ...options,
    bypassCache: true,
  });
}

export async function downloadExport(
  exportId: number,
  options?: GoatCounterRequestOptions
): Promise<Response> {
  return gcFetchRaw(`/api/v0/export/${exportId}/download`, {}, options);
}

/** Event name of the test visit, so it is easy to recognize (and purge). */
export const TEST_VISIT_EVENT = "gtcd-connection-test";

/**
 * Record one labelled event through POST /api/v0/count to prove that gtcd's
 * API token can reach GoatCounter and write data. GoatCounter answers 202
 * and persists the hit in the background within a few seconds.
 */
export async function sendTestVisit(
  options: Pick<GoatCounterRequestOptions, "vhost"> & {
    readonly locale: Locale;
  }
): Promise<void> {
  const response = await gcFetchRaw(
    "/api/v0/count",
    {
      body: JSON.stringify({
        filter: [],
        hits: [
          {
            event: true,
            path: TEST_VISIT_EVENT,
            title: "gtcd connection test",
          },
        ],
        no_sessions: true,
      }),
      method: "POST",
    },
    { vhost: options.vhost }
  );
  if (response.status === 202) return;

  if (response.status === 401 || response.status === 403) {
    throw new Error(translate(options.locale, "settings.testVisitNeedsCount"));
  }

  const body = (await response.json().catch(() => null)) as {
    readonly error?: string;
  } | null;
  throw new Error(
    body?.error ??
      translate(options.locale, "settings.testVisitRejected", {
        status: response.status,
      })
  );
}
