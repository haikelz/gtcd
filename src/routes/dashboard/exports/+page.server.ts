import { error, fail, redirect } from "@sveltejs/kit";
import { requireDashboardAdmin } from "$lib/server/auth/admin.js";
import * as admin from "$lib/server/goatcounter/admin.js";
import * as stats from "$lib/server/goatcounter/stats.js";

function parseExportId(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value)) return null;

  const exportId = Number(value);
  return Number.isSafeInteger(exportId) && exportId > 0 ? exportId : null;
}

export async function load({ locals, url }) {
  requireDashboardAdmin(locals.user);

  const exportId = parseExportId(url.searchParams.get("export"));
  const currentUser = await stats.getMe();
  const job = exportId ? await admin.getExport(exportId) : null;

  if (job && job.site_id !== currentUser.user.site) {
    throw error(404, "Export not found.");
  }

  return { job };
}

export const actions = {
  create: async ({ request, locals }) => {
    requireDashboardAdmin(locals.user);

    const formData = await request.formData();
    const format = formData.get("format");

    if (format !== "csv" && format !== "json") {
      return fail(400, { message: "Select CSV or JSON." });
    }

    const job = await admin.createExport(format);
    throw redirect(303, `/dashboard/exports?export=${job.id}`);
  },
};
