import { fail, redirect } from "@sveltejs/kit";
import {
  type DashboardLayout,
  DEFAULT_DASHBOARD_LAYOUT,
  isLocale,
  isWidgetId,
  MAX_SAVED_VIEWS,
  normalizeWidgets,
  sanitizeWidgetOptions,
  sanitizeViewName,
  sanitizeViewQuery,
} from "$lib/dashboard-layout.js";
import { translate } from "$lib/i18n/index.js";
import { isReportFrequency } from "$lib/report-period.js";
import {
  getDashboardLayout,
  saveDashboardLayout,
} from "$lib/server/dashboard-layout-store.js";
import {
  getSubscription,
  sendTestReport,
  updateSubscription,
  updateTrafficAlert,
} from "$lib/server/email-reports.js";
import { getDashboardSiteContext } from "$lib/server/goatcounter/site-context.js";
import { isMailConfigured } from "$lib/server/mailer.js";
import { parseTrafficAlertRule } from "$lib/traffic-alert.js";

/** Only return to dashboard report routes after saving a view. */
function safeReturnPath(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;

  return /^\/dashboard(\/[a-z0-9/_-]*)?$/i.test(value) ? value : null;
}

function requireEmail(locals: App.Locals): string {
  if (!locals.user) throw redirect(302, "/login");

  return locals.user.email;
}

export async function load({ locals, url }) {
  const email = requireEmail(locals);
  const save = url.searchParams.get("save");

  return {
    emailReports: {
      configured: isMailConfigured(),
      recipient: email,
      subscription: await getSubscription(email),
    },
    returnTo: safeReturnPath(url.searchParams.get("from")),
    saveQuery: save === null ? null : sanitizeViewQuery(save),
  };
}

export const actions = {
  saveView: async ({ locals, request }) => {
    const email = requireEmail(locals);
    const formData = await request.formData();
    const name = sanitizeViewName(formData.get("name"));
    const rawQuery = formData.get("query");
    const params = new URLSearchParams(
      typeof rawQuery === "string" ? sanitizeViewQuery(rawQuery) : ""
    );
    const selectedSite = formData.get("site");
    if (typeof selectedSite === "string" && selectedSite)
      params.set("site", selectedSite);
    const requestedSite = params.get("site");
    if (
      requestedSite &&
      (!/^\d+$/.test(requestedSite) ||
        !Number.isSafeInteger(Number(requestedSite)) ||
        Number(requestedSite) < 1)
    ) {
      return fail(400, {
        action: "saveView",
        message: translate(locals.locale, "customize.siteUnavailable"),
      });
    }
    const contextUrl = new URL(request.url);
    if (params.has("site"))
      contextUrl.searchParams.set("site", params.get("site") ?? "");
    const context = await getDashboardSiteContext(contextUrl).catch(() => null);
    if (!context) {
      return fail(400, {
        action: "saveView",
        message: translate(locals.locale, "customize.siteUnavailable"),
      });
    }
    params.set("site", String(context.site.id));
    const query = sanitizeViewQuery(params.toString());
    const makeDefault = formData.get("makeDefault") === "on";
    const returnTo = safeReturnPath(formData.get("returnTo"));

    if (!name) {
      return fail(400, {
        action: "saveView",
        message: translate(locals.locale, "customize.viewNameInvalid"),
      });
    }

    const layout = await getDashboardLayout(email);
    const others = layout.views.filter((view) => view.name !== name);
    if (others.length >= MAX_SAVED_VIEWS) {
      return fail(400, {
        action: "saveView",
        message: translate(locals.locale, "customize.tooManyViews", {
          max: MAX_SAVED_VIEWS,
        }),
      });
    }

    await saveDashboardLayout(email, {
      ...layout,
      defaultView: makeDefault ? name : layout.defaultView,
      views: [...others, { name, query }],
    });

    if (returnTo) {
      const target = new URLSearchParams(query);
      const search = target.toString();
      throw redirect(303, search ? `${returnTo}?${search}` : returnTo);
    }

    return {
      action: "saveView",
      message: translate(locals.locale, "customize.viewSaved", { name }),
    };
  },
  deleteView: async ({ locals, request }) => {
    const email = requireEmail(locals);
    const formData = await request.formData();
    const name = sanitizeViewName(formData.get("name"));
    const layout = await getDashboardLayout(email);

    await saveDashboardLayout(email, {
      ...layout,
      defaultView: layout.defaultView === name ? null : layout.defaultView,
      views: layout.views.filter((view) => view.name !== name),
    });

    return {
      action: "deleteView",
      message: translate(locals.locale, "customize.viewDeleted"),
    };
  },
  setDefaultView: async ({ locals, request }) => {
    const email = requireEmail(locals);
    const formData = await request.formData();
    const name = sanitizeViewName(formData.get("name"));
    const layout = await getDashboardLayout(email);
    const defaultView =
      name && layout.views.some((view) => view.name === name) ? name : null;

    await saveDashboardLayout(email, { ...layout, defaultView });

    return {
      action: "setDefaultView",
      message: defaultView
        ? translate(locals.locale, "customize.defaultViewSet", {
            name: defaultView,
          })
        : translate(locals.locale, "customize.defaultViewCleared"),
    };
  },
  saveWidgets: async ({ locals, request }) => {
    const email = requireEmail(locals);
    const formData = await request.formData();
    const layout = await getDashboardLayout(email);

    if (formData.get("reset") === "on") {
      await saveDashboardLayout(email, {
        ...layout,
        widgets: DEFAULT_DASHBOARD_LAYOUT.widgets,
      });
      return {
        action: "saveWidgets",
        message: translate(locals.locale, "customize.widgetsReset"),
      };
    }

    const hidden = new Set(formData.getAll("hidden").filter(isWidgetId));
    const order = formData.getAll("widget").filter(isWidgetId);
    const widgets: DashboardLayout["widgets"] = normalizeWidgets(
      order.map((id) => ({
        hidden: hidden.has(id),
        id,
        options: sanitizeWidgetOptions(id, {
          limit: formData.get(`limit:${id}`) || undefined,
          style: formData.get(`style:${id}`) || undefined,
        }),
      }))
    );

    if (widgets.every((widget) => widget.hidden)) {
      return fail(400, {
        action: "saveWidgets",
        message: translate(locals.locale, "customize.keepOneWidget"),
      });
    }

    await saveDashboardLayout(email, { ...layout, widgets });

    return {
      action: "saveWidgets",
      message: translate(locals.locale, "customize.widgetsSaved"),
    };
  },
  saveEmailReport: async ({ locals, request }) => {
    const email = requireEmail(locals);
    const formData = await request.formData();
    const frequency = formData.get("frequency");
    const site = formData.get("siteId");

    if (!isReportFrequency(frequency)) {
      return fail(400, {
        action: "saveEmailReport",
        message: translate(locals.locale, "customize.frequencyInvalid"),
      });
    }

    const siteId =
      typeof site === "string" && /^\d+$/.test(site) ? Number(site) : null;
    if (siteId === null || !Number.isSafeInteger(siteId) || siteId < 1) {
      return fail(400, {
        action: "saveEmailReport",
        message: translate(locals.locale, "customize.siteUnavailable"),
      });
    }
    const contextUrl = new URL(request.url);
    if (siteId !== null) contextUrl.searchParams.set("site", String(siteId));
    const context = await getDashboardSiteContext(contextUrl).catch(() => null);
    if (!context) {
      return fail(400, {
        action: "saveEmailReport",
        message: translate(locals.locale, "customize.siteUnavailable"),
      });
    }
    await updateSubscription(email, frequency, context.site.id);

    return {
      action: "saveEmailReport",
      message:
        frequency === "never"
          ? translate(locals.locale, "customize.emailReportsOff")
          : translate(locals.locale, "customize.emailScheduleSaved"),
    };
  },
  saveTrafficAlert: async ({ locals, request }) => {
    const email = requireEmail(locals);
    const formData = await request.formData();
    const enabled = formData.get("enabled") === "on";
    const rule = parseTrafficAlertRule({
      direction: formData.get("direction"),
      minimum: Number(formData.get("minimum")),
      threshold: Number(formData.get("threshold")),
    });
    const siteValue = formData.get("siteId");
    const siteId =
      typeof siteValue === "string" && /^\d+$/.test(siteValue)
        ? Number(siteValue)
        : NaN;
    if (enabled && (!rule || !Number.isSafeInteger(siteId) || siteId < 1)) {
      return fail(400, {
        action: "saveTrafficAlert",
        message: translate(locals.locale, "customize.alertInvalid"),
      });
    }
    if (enabled && !isMailConfigured()) {
      return fail(400, {
        action: "saveTrafficAlert",
        message: translate(locals.locale, "customize.emailNotConfigured"),
      });
    }
    try {
      await updateTrafficAlert(email, enabled ? rule : null, siteId);
    } catch {
      return fail(400, {
        action: "saveTrafficAlert",
        message: translate(locals.locale, "customize.alertSaveFailed"),
      });
    }

    return {
      action: "saveTrafficAlert",
      message: translate(
        locals.locale,
        enabled ? "customize.alertSaved" : "customize.alertOff"
      ),
    };
  },
  sendTestEmail: async ({ locals }) => {
    const email = requireEmail(locals);

    if (!isMailConfigured()) {
      return fail(400, {
        action: "sendTestEmail",
        message: translate(locals.locale, "customize.emailNotConfigured"),
      });
    }

    try {
      await sendTestReport(email);
    } catch (cause: unknown) {
      return fail(502, {
        action: "sendTestEmail",
        message:
          cause instanceof Error
            ? translate(locals.locale, "customize.testEmailFailedReason", {
                reason: cause.message,
              })
            : translate(locals.locale, "customize.testEmailFailed"),
      });
    }

    return {
      action: "sendTestEmail",
      message: translate(locals.locale, "customize.testEmailSent", { email }),
    };
  },
  saveDisplay: async ({ locals, request }) => {
    const email = requireEmail(locals);
    const formData = await request.formData();
    const layout = await getDashboardLayout(email);
    const fewerNumbers = formData.get("fewerNumbers");
    const locale = formData.get("locale");

    await saveDashboardLayout(email, {
      ...layout,
      overrides: {
        // "follow" (or anything else) defers to the GoatCounter setting.
        fewerNumbers:
          fewerNumbers === "on" ? true : fewerNumbers === "off" ? false : null,
        locale: isLocale(locale) ? locale : null,
      },
    });

    return {
      action: "saveDisplay",
      // Confirm in the newly chosen language when one was picked.
      message: translate(
        isLocale(locale) ? locale : locals.locale,
        "customize.displaySaved"
      ),
    };
  },
};
