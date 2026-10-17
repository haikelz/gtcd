import { randomInt } from "node:crypto";
import { error, fail, redirect } from "@sveltejs/kit";
import {
  getGoatCounterAdminUrl,
  requireDashboardAdmin,
} from "$lib/server/auth/admin.js";
import * as admin from "$lib/server/goatcounter/admin.js";
import * as stats from "$lib/server/goatcounter/stats.js";
import { getDashboardSiteContext } from "$lib/server/goatcounter/site-context.js";
import {
  createShareLink,
  getShareLinks,
  SHARE_RANGES,
  SHARE_METRICS,
  type ShareLink,
  isShareExpiryDays,
  revokeShareLink,
} from "$lib/server/share-store.js";
import type { Site, SiteSettings } from "$lib/server/goatcounter/types.js";
import type { Locale } from "$lib/dashboard-layout";
import { translate, type MessageKey } from "$lib/i18n";

const SITE_READ_PERMISSION = 8;
const SITE_CREATE_PERMISSION = 16;
const SITE_UPDATE_PERMISSION = 32;
const COLLECT_NOTHING = 1;
const COLLECT_REFERRER = 2;
const COLLECT_USER_AGENT = 4;
const COLLECT_SCREEN_SIZE = 8;
const COLLECT_LOCATION = 16;
const COLLECT_LOCATION_REGION = 32;
const COLLECT_LANGUAGE = 64;
const COLLECT_SESSION = 128;
const COLLECT_HITS = 256;

const PUBLIC_MODES = ["private", "secret", "public"] as const;
const SECRET_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

type PublicMode = (typeof PUBLIC_MODES)[number];

type SettingsField =
  "cname" | "public" | "secret" | "ignoreIps" | "collectRegions" | "allowEmbed";

type SettingsUpdateError = {
  readonly field: SettingsField | null;
  readonly message: string;
};

function hasPermission(permissions: number, permission: number): boolean {
  return (
    Number.isSafeInteger(permissions) &&
    (permissions & permission) === permission
  );
}

function requireSiteReadPermission(permissions: number, locale: Locale): void {
  if (!hasPermission(permissions, SITE_READ_PERMISSION)) {
    throw error(403, translate(locale, "settings.siteReadPermission"));
  }
}

function requireSiteUpdatePermission(
  permissions: number,
  locale: Locale
): void {
  if (!hasPermission(permissions, SITE_UPDATE_PERMISSION)) {
    throw error(403, translate(locale, "settings.siteUpdatePermission"));
  }
}

function requireSiteCreatePermission(
  permissions: number,
  locale: Locale
): void {
  if (!hasPermission(permissions, SITE_CREATE_PERMISSION)) {
    throw error(403, translate(locale, "settings.siteCreatePermission"));
  }
}

function parsePositiveInteger(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function parseSiteHostname(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string" || !value.trim()) return null;

  const hostname = value.trim().toLowerCase();
  try {
    return new URL(`https://${hostname}`).hostname === hostname
      ? hostname
      : null;
  } catch {
    return null;
  }
}

function parseList(value: FormDataEntryValue | null): readonly string[] {
  if (typeof value !== "string") return [];

  return value
    .split(/\r?\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseCollection(formData: FormData): number {
  const flags = [
    ["collectHits", COLLECT_HITS],
    ["collectSessions", COLLECT_SESSION],
    ["collectReferrer", COLLECT_REFERRER],
    ["collectUserAgent", COLLECT_USER_AGENT],
    ["collectScreenSize", COLLECT_SCREEN_SIZE],
    ["collectLocation", COLLECT_LOCATION],
    ["collectRegion", COLLECT_LOCATION_REGION],
    ["collectLanguage", COLLECT_LANGUAGE],
  ] as const;

  const collect = flags.reduce(
    (value, [field, flag]) =>
      formData.get(field) === "on" ? value | flag : value,
    0
  );

  if ((collect & COLLECT_LOCATION_REGION) === COLLECT_LOCATION_REGION) {
    return collect | COLLECT_LOCATION;
  }

  return collect || COLLECT_NOTHING;
}

function isPublicMode(value: unknown): value is PublicMode {
  return PUBLIC_MODES.some((mode) => mode === value);
}

/** GoatCounter accepts 8–40 alphanumeric characters for the access token. */
function isValidSecret(value: string): boolean {
  return /^[A-Za-z0-9]{8,40}$/.test(value);
}

function generateSecret(): string {
  return Array.from(
    { length: 32 },
    () => SECRET_ALPHABET[randomInt(SECRET_ALPHABET.length)]
  ).join("");
}

/**
 * Link to GoatCounter's own dashboard that unlocks a "secret" site for
 * viewers. Needs the public GoatCounter URL; gtcd serves "/" itself.
 */
function shareUrl(secret: string): string | null {
  const adminUrl = getGoatCounterAdminUrl();
  if (!adminUrl) return null;

  const url = new URL(adminUrl);
  url.searchParams.set("access-token", secret);
  return url.toString();
}

function toDashboardSite(site: Site): Omit<Site, "settings"> & {
  readonly settings: Omit<SiteSettings, "secret">;
} {
  const settings = { ...site.settings };
  Reflect.deleteProperty(settings, "secret");
  return { ...site, settings };
}

function getSettingsUpdateError(
  error: unknown,
  locale: Locale
): SettingsUpdateError {
  const message =
    error instanceof Error
      ? error.message
      : translate(locale, "settings.saveFailed");
  // GoatCounter's text after the field prefix stays as the API returned it.
  const prefix = (key: MessageKey): string => `${translate(locale, key)}:`;

  if (message.startsWith("settings.ignore_ips:")) {
    return {
      field: "ignoreIps",
      message: message.replace(
        "settings.ignore_ips:",
        prefix("settings.ignoreIps")
      ),
    };
  }

  if (message.startsWith("settings.collect_regions:")) {
    return {
      field: "collectRegions",
      message: message.replace(
        "settings.collect_regions:",
        prefix("settings.collectRegions")
      ),
    };
  }

  if (message.startsWith("settings.allow_embed:")) {
    return {
      field: "allowEmbed",
      message: message.replace(
        "settings.allow_embed:",
        prefix("settings.allowEmbed")
      ),
    };
  }

  if (message.startsWith("cname:")) {
    return {
      field: "cname",
      message: message.replace("cname:", prefix("settings.hostname")),
    };
  }

  if (message.startsWith("settings.secret:")) {
    return {
      field: "secret",
      message: message.replace(
        "settings.secret:",
        prefix("settings.accessToken")
      ),
    };
  }

  if (message.startsWith("settings.public:")) {
    return {
      field: "public",
      message: message.replace(
        "settings.public:",
        prefix("settings.publicSetting")
      ),
    };
  }

  return { field: null, message };
}

export async function load({ locals, url }) {
  requireDashboardAdmin(locals.user);

  const currentUser = await stats.getMe();
  requireSiteReadPermission(currentUser.token.permissions, locals.locale);
  const siteContext = await getDashboardSiteContext(url);
  const site = await admin.getSite(siteContext.site.id);
  let shareLinks: ShareLink[] = [];
  let shareUnavailable = false;
  try {
    shareLinks = await getShareLinks(siteContext.site.id);
  } catch {
    shareUnavailable = true;
  }
  const shareLink = shareLinks.find((link) => link.id === "default");

  // The access token only grants read access and is shown to admins, the
  // same audience GoatCounter's own settings page shows it to.
  const secret =
    site.settings.public === "secret" && site.settings.secret
      ? site.settings.secret
      : null;

  return {
    shareUnavailable,
    shareLinks: shareLinks
      .filter((link) => link.id !== "default")
      .map((link) => ({ ...link, url: `${url.origin}/share/${link.token}` })),
    publicLink: shareLink ? `${url.origin}/share/${shareLink.token}` : null,
    publicLinkExpiresAt: shareLink?.expiresAt ?? null,
    sharing: {
      counterOrigin: site.cname ? `https://${site.cname}` : null,
      secret,
      shareUrl: secret ? shareUrl(secret) : null,
    },
    site: toDashboardSite({ ...site, id: siteContext.site.id }),
    sites: siteContext.sites,
    canCreateSite: hasPermission(
      currentUser.token.permissions,
      SITE_CREATE_PERMISSION
    ),
    created: url.searchParams.get("created"),
    updated: url.searchParams.get("updated"),
  };
}

export const actions = {
  createShareLink: async ({ locals, request }) => {
    requireDashboardAdmin(locals.user);

    const form = await request.formData();
    const expiry = form.get("expiryDays");
    const expiryDays =
      expiry === "never" ? "never" : expiry === null ? 7 : Number(expiry);
    if (
      (expiry !== null &&
        !["1", "7", "30", "never"].includes(String(expiry))) ||
      !isShareExpiryDays(expiryDays)
    ) {
      return fail(400, {
        field: "expiryDays",
        message: translate(locals.locale, "share.invalidExpiry"),
      });
    }

    const siteContext = await getDashboardSiteContext(new URL(request.url));
    const label = form.get("label");
    const id = form.get("id");
    const rangeValue = form.get("maxRange");
    const maxRange = SHARE_RANGES.find((range) => range === rangeValue);
    const metricValues = form.getAll("metrics");
    const metrics = SHARE_METRICS.filter((metric) =>
      metricValues.includes(metric)
    );
    if (
      (label === null && (rangeValue !== null || metricValues.length > 0)) ||
      (label !== null &&
        (typeof label !== "string" ||
          !label.trim() ||
          label.trim().length > 80 ||
          !maxRange ||
          !metrics.length ||
          metrics.length !== metricValues.length)) ||
      (id !== null &&
        (typeof id !== "string" || !/^(default|[A-Za-z0-9]{32})$/.test(id)))
    ) {
      return fail(400, {
        field: "share",
        message: translate(locals.locale, "share.invalidGrant"),
      });
    }
    try {
      await createShareLink(siteContext.site.id, {
        expiryDays,
        ...(typeof label === "string" ? { label, maxRange, metrics } : {}),
        ...(typeof id === "string" ? { id } : {}),
      });
    } catch (cause) {
      return fail(cause instanceof RangeError ? 400 : 503, {
        field: "share",
        message: translate(
          locals.locale,
          cause instanceof RangeError
            ? "share.invalidGrant"
            : "share.unavailable"
        ),
      });
    }
    return { shareLink: "created" };
  },
  revokeShareLink: async ({ locals, request }) => {
    requireDashboardAdmin(locals.user);

    const siteContext = await getDashboardSiteContext(new URL(request.url));
    const form = await request.formData();
    const id = form.get("id") ?? "default";
    if (typeof id !== "string" || !/^(default|[A-Za-z0-9]{32})$/.test(id))
      return fail(400, {
        field: "share",
        message: translate(locals.locale, "share.invalidGrant"),
      });
    try {
      await revokeShareLink(siteContext.site.id, id);
    } catch (cause) {
      return fail(cause instanceof RangeError ? 400 : 503, {
        field: "share",
        message: translate(
          locals.locale,
          cause instanceof RangeError
            ? "share.invalidGrant"
            : "share.unavailable"
        ),
      });
    }
    return { shareLink: "revoked" };
  },
  sendTestVisit: async ({ locals, request }) => {
    requireDashboardAdmin(locals.user);

    const siteContext = await getDashboardSiteContext(new URL(request.url));
    try {
      await admin.sendTestVisit({
        locale: locals.locale,
        vhost: siteContext.vhost,
      });
    } catch (cause: unknown) {
      return fail(400, {
        field: null,
        message:
          cause instanceof Error
            ? cause.message
            : translate(locals.locale, "settings.testVisitNotRecorded"),
        testVisit: false,
      });
    }

    return { testVisit: true };
  },
  createSite: async ({ request, locals }) => {
    requireDashboardAdmin(locals.user);

    const formData = await request.formData();
    const cname = parseSiteHostname(formData.get("cname"));
    const linkDomain = formData.get("linkDomain");
    const values = {
      cname:
        typeof formData.get("cname") === "string"
          ? String(formData.get("cname"))
          : "",
      linkDomain: typeof linkDomain === "string" ? linkDomain : "",
    };

    if (!cname || typeof linkDomain !== "string") {
      return fail(400, {
        field: null,
        message: translate(locals.locale, "settings.invalidHostname"),
        values,
      });
    }

    const currentUser = await stats.getMe();
    requireSiteCreatePermission(currentUser.token.permissions, locals.locale);

    try {
      await admin.createSite({ cname, linkDomain: linkDomain.trim() });
    } catch (cause: unknown) {
      return fail(400, {
        field: null,
        message:
          cause instanceof Error
            ? cause.message
            : translate(locals.locale, "settings.createSiteFailed"),
        values,
      });
    }

    throw redirect(303, `/dashboard/settings?created=${Date.now()}`);
  },
  update: async ({ request, locals }) => {
    requireDashboardAdmin(locals.user);

    const formData = await request.formData();
    const siteId = parsePositiveInteger(formData.get("siteId"));
    const cname = parseSiteHostname(formData.get("cname"));
    const dataRetentionValue = formData.get("dataRetention");
    const dataRetention = parsePositiveInteger(dataRetentionValue);
    const linkDomain = formData.get("linkDomain");
    const ignoreIps = formData.get("ignoreIps");
    const collectRegions = formData.get("collectRegions");
    const allowEmbed = formData.get("allowEmbed");
    const secretValue = formData.get("secret");
    const values = {
      linkDomain: typeof linkDomain === "string" ? linkDomain : "",
      cname:
        typeof formData.get("cname") === "string"
          ? String(formData.get("cname"))
          : "",
      public:
        typeof formData.get("public") === "string"
          ? String(formData.get("public"))
          : "",
      secret: typeof secretValue === "string" ? secretValue.trim() : "",
      dataRetention:
        typeof dataRetentionValue === "string" ? dataRetentionValue : "",
      ignoreIps: typeof ignoreIps === "string" ? ignoreIps : "",
      collectRegions: typeof collectRegions === "string" ? collectRegions : "",
      allowEmbed: typeof allowEmbed === "string" ? allowEmbed : "",
      allowCounter: formData.get("allowCounter") === "on",
      allowBosmang: formData.get("allowBosmang") === "on",
      collectHits: formData.get("collectHits") === "on",
      collectSessions: formData.get("collectSessions") === "on",
      collectReferrer: formData.get("collectReferrer") === "on",
      collectUserAgent: formData.get("collectUserAgent") === "on",
      collectScreenSize: formData.get("collectScreenSize") === "on",
      collectLocation: formData.get("collectLocation") === "on",
      collectRegion: formData.get("collectRegion") === "on",
      collectLanguage: formData.get("collectLanguage") === "on",
    };

    if (
      !siteId ||
      !cname ||
      dataRetention === null ||
      typeof linkDomain !== "string"
    ) {
      return fail(400, {
        field: null,
        message: translate(locals.locale, "settings.invalidSettings"),
        values,
      });
    }

    if (!isPublicMode(values.public)) {
      return fail(400, {
        field: "public",
        message: translate(locals.locale, "settings.invalidVisibility"),
        values,
      });
    }
    if (
      values.public === "secret" &&
      values.secret &&
      !isValidSecret(values.secret)
    ) {
      return fail(400, {
        field: "secret",
        message: translate(locals.locale, "settings.invalidSecret"),
        values,
      });
    }

    const currentUser = await stats.getMe();
    requireSiteReadPermission(currentUser.token.permissions, locals.locale);
    requireSiteUpdatePermission(currentUser.token.permissions, locals.locale);

    const siteContext = await getDashboardSiteContext(new URL(request.url));
    if (siteId !== siteContext.site.id) {
      return fail(403, {
        field: null,
        message: translate(locals.locale, "settings.siteNotManageable"),
        values,
      });
    }

    try {
      const site = await admin.getSite(siteContext.site.id);
      await admin.updateSite(siteContext.site.id, {
        cname,
        linkDomain: linkDomain.trim(),
        settings: {
          ...site.settings,
          public: values.public,
          secret:
            values.public === "secret"
              ? values.secret || site.settings.secret || generateSecret()
              : site.settings.secret,
          data_retention: dataRetention,
          ignore_ips: parseList(ignoreIps),
          collect_regions: parseList(collectRegions),
          allow_embed: parseList(allowEmbed),
          allow_counter: formData.get("allowCounter") === "on",
          allow_bosmang: formData.get("allowBosmang") === "on",
          collect: parseCollection(formData),
        },
      });
    } catch (error) {
      const updateError = getSettingsUpdateError(error, locals.locale);

      return fail(400, { ...updateError, values });
    }

    throw redirect(
      303,
      `/dashboard/settings?site=${siteContext.site.id}&updated=${Date.now()}`
    );
  },
};
