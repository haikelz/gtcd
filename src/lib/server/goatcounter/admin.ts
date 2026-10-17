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

// Released GoatCounter <=2.7 predates the format parameter and JSON archives.
export async function usesLegacyExports(
  options?: GoatCounterRequestOptions
): Promise<boolean> {
  const status = await gcFetch<unknown>("/status", {}, undefined, options);
  if (!status || typeof status !== "object" || !("version" in status))
    return false;
  const version =
    typeof status.version === "string"
      ? status.version.match(/^v?(\d+)\.(\d+)(?:\.|$)/)
      : null;
  return (
    !!version &&
    (Number(version[1]) < 2 ||
      (Number(version[1]) === 2 && Number(version[2]) <= 7))
  );
}

function normalizeExport(value: unknown): ExportJob {
  if (
    !value ||
    typeof value !== "object" ||
    !("id" in value) ||
    typeof value.id !== "number" ||
    !Number.isSafeInteger(value.id) ||
    value.id < 1 ||
    !("site_id" in value) ||
    typeof value.site_id !== "number" ||
    !Number.isSafeInteger(value.site_id) ||
    value.site_id < 1 ||
    !("created_at" in value) ||
    typeof value.created_at !== "string"
  ) {
    throw new Error("Invalid GoatCounter export response");
  }
  const format = "format" in value ? value.format : "csv";
  if (format !== "csv" && format !== "json")
    throw new Error("Invalid GoatCounter export format");
  const finishedAt = "finished_at" in value ? value.finished_at : null;
  const exportError = "error" in value ? value.error : null;
  const size = "size" in value ? value.size : null;
  const rows = "num_rows" in value ? value.num_rows : null;
  if (
    (finishedAt != null && typeof finishedAt !== "string") ||
    (exportError != null && typeof exportError !== "string") ||
    (size != null && typeof size !== "string") ||
    (rows != null &&
      (typeof rows !== "number" || !Number.isSafeInteger(rows) || rows < 0))
  ) {
    throw new Error("Invalid GoatCounter export status");
  }
  return {
    id: value.id,
    site_id: value.site_id,
    format,
    created_at: value.created_at,
    finished_at: finishedAt ?? undefined,
    error: exportError ?? undefined,
    size: size ?? undefined,
    num_rows: rows ?? undefined,
  };
}

export async function createExport(
  input: ExportRequest,
  options?: GoatCounterRequestOptions
): Promise<ExportJob> {
  const legacy = await usesLegacyExports(options);
  if (legacy && input.format === "json")
    throw new Error("JSON exports require a newer GoatCounter build");

  return normalizeExport(
    await gcFetch<unknown>(
      "/api/v0/export",
      {
        method: "POST",
        body: JSON.stringify({
          ...(!legacy ? { format: input.format } : {}),
          start_from_hit_id: input.startFromHitId,
          start_from_day: input.startFromDay,
        }),
      },
      undefined,
      { ...options, bypassCache: true }
    )
  );
}

export async function getExport(
  exportId: number,
  options?: GoatCounterRequestOptions
): Promise<ExportJob> {
  return normalizeExport(
    await gcFetch<unknown>(`/api/v0/export/${exportId}`, {}, undefined, {
      ...options,
      bypassCache: true,
    })
  );
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
