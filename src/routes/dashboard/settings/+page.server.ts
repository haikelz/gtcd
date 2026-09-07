import { fail, redirect } from "@sveltejs/kit";
import { requireDashboardAdmin } from "$lib/server/auth/admin.js";
import * as admin from "$lib/server/goatcounter/admin.js";
import * as stats from "$lib/server/goatcounter/stats.js";

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

    const site = await admin.getSite(siteId);
    await admin.updateSite(siteId, {
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
