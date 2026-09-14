import { error, json } from "@sveltejs/kit";
import { requireDashboardAdmin } from "$lib/server/auth/admin.js";
import { downloadExport, getExport } from "$lib/server/goatcounter/admin.js";
import { getDashboardSiteContext } from "$lib/server/goatcounter/site-context.js";
import type { RequestHandler } from "./$types";

function parseExportId(value: string): number {
  if (!/^\d+$/.test(value)) throw error(400, "Invalid export identifier.");

  const exportId = Number(value);
  if (!Number.isSafeInteger(exportId) || exportId < 1) {
    throw error(400, "Invalid export identifier.");
  }

  return exportId;
}

export const GET: RequestHandler = async ({ locals, params, url }) => {
  requireDashboardAdmin(locals.user);

  const exportId = parseExportId(params.id);
  const siteContext = await getDashboardSiteContext(url);
  const job = await getExport(exportId, { vhost: siteContext.vhost });

  if (job.site_id !== siteContext.site.id) {
    throw error(404, "Export not found.");
  }

  const upstream = await downloadExport(exportId, { vhost: siteContext.vhost });

  if (upstream.status === 202) {
    return json({ error: "Export is still being prepared." }, { status: 202 });
  }

  if (!upstream.ok || !upstream.body) {
    throw error(upstream.status || 502, "Unable to download this export.");
  }

  const contentType =
    upstream.headers.get("content-type") ?? "application/gzip";
  const disposition = `attachment; filename=goatcounter-export-${exportId}.${job.format}.gz`;

  return new Response(upstream.body, {
    headers: {
      "content-disposition": disposition,
      "content-type": contentType,
      "cache-control": "no-store",
    },
  });
};
