import { error, fail, redirect } from "@sveltejs/kit";
import { requireDashboardAdmin } from "$lib/server/auth/admin.js";
import * as admin from "$lib/server/goatcounter/admin.js";
import * as stats from "$lib/server/goatcounter/stats.js";
import { UpstreamHttpError } from "$lib/server/goatcounter/client.js";
import { getDashboardSiteContext } from "$lib/server/goatcounter/site-context.js";
import { getJson, setJson } from "$lib/server/kv.js";
import type {
  ExportJob,
  ExportRequest,
} from "$lib/server/goatcounter/types.js";
import type { Locale } from "$lib/dashboard-layout";
import { translate } from "$lib/i18n";

const EXPORT_PERMISSION = 4;

// GoatCounter allows one export an hour per client address, and every gtcd
// user shares this server's address, so remember when the next one can start.
// ponytail: one key per deployment. Replicas behind different addresses get
// separate GoatCounter buckets, so the notice can overstate their wait; key it
// by egress address if that ever matters.
const EXPORT_COOLDOWN_KEY = "export-cooldown";
const EXPORT_INTERVAL_MS = 3_600_000;

async function startExportCooldown(waitMs: number): Promise<void> {
  await setJson(
    EXPORT_COOLDOWN_KEY,
    Date.now() + waitMs,
    Math.ceil(waitMs / 1000)
  );
}

/** Whole minutes until the next export, or null when one can start now. */
async function exportWaitMinutes(): Promise<number | null> {
  const until = await getJson(EXPORT_COOLDOWN_KEY);
  if (typeof until !== "number" || until <= Date.now()) return null;
  return Math.ceil((until - Date.now()) / 60_000);
}

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
  formData: FormData,
  locale: Locale
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
    return { error: translate(locale, "exports.invalidFormat"), values };
  }

  if (format === "csv") {
    const cursor = parseOptionalPositiveInteger(startFromHitId);
    if (cursor === null) {
      return { error: translate(locale, "exports.invalidCursor"), values };
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
    return { error: translate(locale, "exports.invalidStartDate"), values };
  }

  const date = new Date(`${startFromDay}T00:00:00.000Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== startFromDay
  ) {
    return { error: translate(locale, "exports.invalidStartDate"), values };
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
  const siteContext = await getDashboardSiteContext(url);
  if (!hasExportPermission(currentUser.token.permissions)) {
    throw error(403, translate(locals.locale, "exports.permissionReload"));
  }
  const job = exportId
    ? await admin.getExport(exportId, { vhost: siteContext.vhost })
    : null;

  if (job && job.site_id !== siteContext.site.id) {
    throw error(404, translate(locals.locale, "exports.notFound"));
  }

  const legacyExports = await admin.usesLegacyExports({
    vhost: siteContext.vhost,
  });
  return { job, legacyExports, waitMinutes: await exportWaitMinutes() };
}

export const actions = {
  create: async ({ locals, request, url }) => {
    requireDashboardAdmin(locals.user);

    const parsed = parseExportRequest(await request.formData(), locals.locale);
    if ("error" in parsed) {
      return fail(400, parsed);
    }

    const currentUser = await stats.getMe();
    const siteContext = await getDashboardSiteContext(url);
    if (!hasExportPermission(currentUser.token.permissions)) {
      return fail(403, {
        error: translate(locals.locale, "exports.permission"),
        values: parsed.values,
      });
    }

    let job: ExportJob;
    try {
      if (
        parsed.input.format === "json" &&
        (await admin.usesLegacyExports({ vhost: siteContext.vhost }))
      ) {
        return fail(400, {
          error: translate(locals.locale, "exports.jsonUnsupported"),
          values: parsed.values,
        });
      }

      job = await admin.createExport(parsed.input, {
        vhost: siteContext.vhost,
      });
    } catch (cause) {
      if (cause instanceof UpstreamHttpError && cause.status === 429) {
        const waitMs = cause.retryAfterMs || EXPORT_INTERVAL_MS;
        await startExportCooldown(waitMs);
        return fail(429, {
          error: translate(locals.locale, "exports.hourlyLimit", {
            minutes: Math.max(1, Math.ceil(waitMs / 60_000)),
          }),
          values: parsed.values,
        });
      }
      return fail(
        cause instanceof UpstreamHttpError &&
          cause.status >= 400 &&
          cause.status < 500
          ? cause.status
          : 503,
        {
          error: translate(locals.locale, "exports.requestFailed"),
          values: parsed.values,
        }
      );
    }
    await startExportCooldown(EXPORT_INTERVAL_MS);
    throw redirect(
      303,
      `/dashboard/exports?site=${siteContext.site.id}&export=${job.id}`
    );
  },
};
