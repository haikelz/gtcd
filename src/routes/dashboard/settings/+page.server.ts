import { randomInt } from "node:crypto";
import { error, fail, redirect } from "@sveltejs/kit";
import {
  getGoatCounterAdminUrl,
  requireDashboardAdmin,
} from "$lib/server/auth/admin.js";
import * as admin from "$lib/server/goatcounter/admin.js";
import * as stats from "$lib/server/goatcounter/stats.js";
import { getDashboardSiteContext } from "$lib/server/goatcounter/site-context.js";
import type { Site, SiteSettings } from "$lib/server/goatcounter/types.js";

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

function requireSiteReadPermission(permissions: number): void {
  if (!hasPermission(permissions, SITE_READ_PERMISSION)) {
    throw error(
      403,
      "Settings needs the GoatCounter API token to have site-read permission. Grant site-read and site-update to the configured GOATCOUNTER_API_KEY, then reload."
    );
  }
}

function requireSiteUpdatePermission(permissions: number): void {
  if (!hasPermission(permissions, SITE_UPDATE_PERMISSION)) {
    throw error(
      403,
      "Saving settings needs the GoatCounter API token to have site-update permission. Grant it to the configured GOATCOUNTER_API_KEY, then reload."
    );
  }
}

function requireSiteCreatePermission(permissions: number): void {
  if (!hasPermission(permissions, SITE_CREATE_PERMISSION)) {
    throw error(
      403,
      "Creating a site needs the GoatCounter API token to have site-create permission. Grant site-create to the configured GOATCOUNTER_API_KEY, then reload."
    );
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

function getSettingsUpdateError(error: unknown): SettingsUpdateError {
  const message =
    error instanceof Error
      ? error.message
      : "GoatCounter could not save these settings.";

  if (message.startsWith("settings.ignore_ips:")) {
    return {
      field: "ignoreIps",
      message: message.replace("settings.ignore_ips:", "Ignored IP addresses:"),
    };
  }

  if (message.startsWith("settings.collect_regions:")) {
    return {
      field: "collectRegions",
      message: message.replace(
        "settings.collect_regions:",
        "Countries with regional reporting:"
      ),
    };
  }

  if (message.startsWith("settings.allow_embed:")) {
    return {
      field: "allowEmbed",
      message: message.replace(
        "settings.allow_embed:",
        "Allowed embed origins:"
      ),
    };
  }

  if (message.startsWith("cname:")) {
    return { field: "cname", message: message.replace("cname:", "Hostname:") };
  }

  if (message.startsWith("settings.secret:")) {
    return {
      field: "secret",
      message: message.replace("settings.secret:", "Access token:"),
    };
  }

  if (message.startsWith("settings.public:")) {
    return {
      field: "public",
      message: message.replace("settings.public:", "Public setting:"),
    };
  }

  return { field: null, message };
}

export async function load({ locals, url }) {
  requireDashboardAdmin(locals.user);

  const currentUser = await stats.getMe();
  requireSiteReadPermission(currentUser.token.permissions);
  const siteContext = await getDashboardSiteContext(url);
  const site = await admin.getSite(siteContext.site.id);

  // The access token only grants read access and is shown to admins, the
  // same audience GoatCounter's own settings page shows it to.
  const secret =
    site.settings.public === "secret" && site.settings.secret
      ? site.settings.secret
      : null;

  return {
    sharing: {
      counterOrigin: site.cname ? `https://${site.cname}` : null,
      secret,
      shareUrl: secret ? shareUrl(secret) : null,
    },
    site: toDashboardSite(site),
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
        message: "Provide a valid analytics hostname.",
        values,
      });
    }

    const currentUser = await stats.getMe();
    requireSiteCreatePermission(currentUser.token.permissions);

    try {
      await admin.createSite({ cname, linkDomain: linkDomain.trim() });
    } catch (cause: unknown) {
      return fail(400, {
        field: null,
        message:
          cause instanceof Error
            ? cause.message
            : "GoatCounter could not create this site.",
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
        message: "Please provide valid site settings.",
        values,
      });
    }

    if (!isPublicMode(values.public)) {
      return fail(400, {
        field: "public",
        message: "Choose private, secret link or public.",
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
        message: "Access token: use 8 to 40 letters and digits.",
        values,
      });
    }

    const currentUser = await stats.getMe();
    requireSiteReadPermission(currentUser.token.permissions);
    requireSiteUpdatePermission(currentUser.token.permissions);

    const siteContext = await getDashboardSiteContext(new URL(request.url));
    if (siteId !== siteContext.site.id) {
      return fail(403, {
        field: null,
        message: "This site cannot be managed here.",
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
      const updateError = getSettingsUpdateError(error);

      return fail(400, { ...updateError, values });
    }

    throw redirect(
      303,
      `/dashboard/settings?site=${siteContext.site.id}&updated=${Date.now()}`
    );
  },
};
