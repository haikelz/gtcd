import { error, json } from "@sveltejs/kit";
import { requireDashboardAdmin } from "$lib/server/auth/admin.js";
import { downloadExport } from "$lib/server/goatcounter/admin.js";
import type { RequestHandler } from "./$types";

function parseExportId(value: string): number {
  if (!/^\d+$/.test(value)) throw error(400, "Invalid export identifier.");

  const exportId = Number(value);
  if (!Number.isSafeInteger(exportId) || exportId < 1) {
    throw error(400, "Invalid export identifier.");
  }

  return exportId;
}

export const GET: RequestHandler = async ({ locals, params }) => {
  requireDashboardAdmin(locals.user);

  const exportId = parseExportId(params.id);
  const upstream = await downloadExport(exportId);

  if (upstream.status === 202) {
    return json({ error: "Export is still being prepared." }, { status: 202 });
  }

  if (!upstream.ok || !upstream.body) {
    throw error(upstream.status || 502, "Unable to download this export.");
  }

  const contentType = upstream.headers.get("content-type") || "text/csv";
  const disposition = `attachment; filename=goatcounter-export-${exportId}.csv`;

  return new Response(upstream.body, {
    headers: {
      "content-disposition": disposition,
      "content-type": contentType,
      "cache-control": "no-store",
    },
  });
};
