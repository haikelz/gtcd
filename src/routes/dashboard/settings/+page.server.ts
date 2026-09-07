import { error, fail, redirect } from "@sveltejs/kit";
import { requireDashboardAdmin } from "$lib/server/auth/admin.js";
import * as admin from "$lib/server/goatcounter/admin.js";
import * as stats from "$lib/server/goatcounter/stats.js";

const SITE_READ_PERMISSION = 8;
const SITE_UPDATE_PERMISSION = 32;

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

export async function load({ locals, url }) {
  requireDashboardAdmin(locals.user);

  const currentUser = await stats.getMe();
  requireSiteReadPermission(currentUser.token.permissions);

  const [site, sites] = await Promise.all([
    admin.getSite(currentUser.user.site),
    admin.getSites(),
  ]);

  return { site, sites, updated: url.searchParams.has("updated") };
}

export const actions = {
  update: async ({ request, locals }) => {
    requireDashboardAdmin(locals.user);

    const formData = await request.formData();
    const siteId = parsePositiveInteger(formData.get("siteId"));
    const dataRetention = parsePositiveInteger(formData.get("dataRetention"));
    const linkDomain = formData.get("linkDomain");

    if (!siteId || dataRetention === null || typeof linkDomain !== "string") {
      return fail(400, { message: "Please provide valid site settings." });
    }

    const currentUser = await stats.getMe();
    requireSiteReadPermission(currentUser.token.permissions);
    requireSiteUpdatePermission(currentUser.token.permissions);

    if (siteId !== currentUser.user.site) {
      return fail(403, { message: "This site cannot be managed here." });
    }

    const site = await admin.getSite(currentUser.user.site);
    await admin.updateSite(currentUser.user.site, {
      linkDomain: linkDomain.trim(),
      settings: {
        ...site.settings,
        data_retention: dataRetention,
        ignore_ips: parseList(formData.get("ignoreIps")),
        collect_regions: parseList(formData.get("collectRegions")),
        allow_embed: parseList(formData.get("allowEmbed")),
        allow_counter: formData.get("allowCounter") === "on",
        allow_bosmang: formData.get("allowBosmang") === "on",
      },
    });

    throw redirect(303, "/dashboard/settings?updated=1");
  },
};
