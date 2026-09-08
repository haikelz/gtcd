import { error, fail, redirect } from "@sveltejs/kit";
import { requireDashboardAdmin } from "$lib/server/auth/admin.js";
import * as admin from "$lib/server/goatcounter/admin.js";
import * as stats from "$lib/server/goatcounter/stats.js";

const SITE_READ_PERMISSION = 8;
const SITE_UPDATE_PERMISSION = 32;

type SettingsField = "ignoreIps" | "collectRegions" | "allowEmbed";

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

function parsePositiveInteger(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function parseList(value: FormDataEntryValue | null): readonly string[] {
  if (typeof value !== "string") return [];

  return value
    .split(/\r?\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean);
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

  return { field: null, message };
}

export async function load({ locals, url }) {
  requireDashboardAdmin(locals.user);

  const currentUser = await stats.getMe();
  requireSiteReadPermission(currentUser.token.permissions);

  const [site, sites] = await Promise.all([
    admin.getSite(currentUser.user.site),
    admin.getSites(),
  ]);

  return { site, sites, updated: url.searchParams.get("updated") };
}

export const actions = {
  update: async ({ request, locals }) => {
    requireDashboardAdmin(locals.user);

    const formData = await request.formData();
    const siteId = parsePositiveInteger(formData.get("siteId"));
    const dataRetentionValue = formData.get("dataRetention");
    const dataRetention = parsePositiveInteger(dataRetentionValue);
    const linkDomain = formData.get("linkDomain");
    const ignoreIps = formData.get("ignoreIps");
    const collectRegions = formData.get("collectRegions");
    const allowEmbed = formData.get("allowEmbed");
    const values = {
      linkDomain: typeof linkDomain === "string" ? linkDomain : "",
      dataRetention:
        typeof dataRetentionValue === "string" ? dataRetentionValue : "",
      ignoreIps: typeof ignoreIps === "string" ? ignoreIps : "",
      collectRegions: typeof collectRegions === "string" ? collectRegions : "",
      allowEmbed: typeof allowEmbed === "string" ? allowEmbed : "",
      allowCounter: formData.get("allowCounter") === "on",
      allowBosmang: formData.get("allowBosmang") === "on",
    };

    if (!siteId || dataRetention === null || typeof linkDomain !== "string") {
      return fail(400, {
        field: null,
        message: "Please provide valid site settings.",
        values,
      });
    }

    const currentUser = await stats.getMe();
    requireSiteReadPermission(currentUser.token.permissions);
    requireSiteUpdatePermission(currentUser.token.permissions);

    if (siteId !== currentUser.user.site) {
      return fail(403, {
        field: null,
        message: "This site cannot be managed here.",
        values,
      });
    }

    try {
      const site = await admin.getSite(currentUser.user.site);
      await admin.updateSite(currentUser.user.site, {
        linkDomain: linkDomain.trim(),
        settings: {
          ...site.settings,
          data_retention: dataRetention,
          ignore_ips: parseList(ignoreIps),
          collect_regions: parseList(collectRegions),
          allow_embed: parseList(allowEmbed),
          allow_counter: formData.get("allowCounter") === "on",
          allow_bosmang: formData.get("allowBosmang") === "on",
        },
      });
    } catch (error) {
      const updateError = getSettingsUpdateError(error);

      return fail(400, { ...updateError, values });
    }

    throw redirect(303, `/dashboard/settings?updated=${Date.now()}`);
  },
};
