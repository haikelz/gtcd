import { error, fail, redirect } from "@sveltejs/kit";
import { requireDashboardAdmin } from "$lib/server/auth/admin.js";
import * as admin from "$lib/server/goatcounter/admin.js";
import * as stats from "$lib/server/goatcounter/stats.js";
import type { ExportRequest } from "$lib/server/goatcounter/types.js";

const EXPORT_PERMISSION = 4;

function parseExportId(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value)) return null;

  const exportId = Number(value);
  return Number.isSafeInteger(exportId) && exportId > 0 ? exportId : null;
}

function hasExportPermission(permissions: number): boolean {
  return (
    Number.isSafeInteger(permissions) &&
    (permissions & EXPORT_PERMISSION) === EXPORT_PERMISSION
  );
}

function parseOptionalPositiveInteger(
  value: FormDataEntryValue | null
): number | null | undefined {
  if (value === null || value === "") return undefined;
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseExportRequest(
  formData: FormData
):
  | { readonly input: ExportRequest; readonly values: Record<string, string> }
  | { readonly error: string; readonly values: Record<string, string> } {
  const format = formData.get("format");
  const startFromHitId = formData.get("startFromHitId");
  const startFromDay = formData.get("startFromDay");
  const values = {
    format: typeof format === "string" ? format : "",
    startFromHitId: typeof startFromHitId === "string" ? startFromHitId : "",
    startFromDay: typeof startFromDay === "string" ? startFromDay : "",
  };

  if (format !== "csv" && format !== "json") {
    return { error: "Choose an export format.", values };
  }

  if (format === "csv") {
    const cursor = parseOptionalPositiveInteger(startFromHitId);
    if (cursor === null) {
      return { error: "CSV cursor must be a positive whole number.", values };
    }

    return {
      input: {
        format,
        ...(cursor ? { startFromHitId: cursor } : {}),
      },
      values,
    };
  }

  if (startFromDay === "") {
    return { input: { format }, values };
  }

  if (
    typeof startFromDay !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(startFromDay)
  ) {
    return { error: "Choose a valid JSON export start date.", values };
  }

  const date = new Date(`${startFromDay}T00:00:00.000Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== startFromDay
  ) {
    return { error: "Choose a valid JSON export start date.", values };
  }

  return {
    input: { format, startFromDay: date.toISOString() },
    values,
  };
}

export async function load({ locals, url }) {
  requireDashboardAdmin(locals.user);

  const exportId = parseExportId(url.searchParams.get("export"));
  const currentUser = await stats.getMe();
  if (!hasExportPermission(currentUser.token.permissions)) {
    throw error(
      403,
      "Exports need the GoatCounter API token to have export permission. Grant export permission to GOATCOUNTER_API_KEY, then reload."
    );
  }
  const job = exportId ? await admin.getExport(exportId) : null;

  if (job && job.site_id !== currentUser.user.site) {
    throw error(404, "Export not found.");
  }

  return { job };
}

export const actions = {
  create: async ({ locals, request }) => {
    requireDashboardAdmin(locals.user);

    const parsed = parseExportRequest(await request.formData());
    if ("error" in parsed) {
      return fail(400, parsed);
    }

    const currentUser = await stats.getMe();
    if (!hasExportPermission(currentUser.token.permissions)) {
      return fail(403, {
        error:
          "Exports need the GoatCounter API token to have export permission.",
        values: parsed.values,
      });
    }

    const job = await admin.createExport(parsed.input);
    throw redirect(303, `/dashboard/exports?export=${job.id}`);
  },
};
